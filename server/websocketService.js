const WebSocket = require('ws');
const axios = require('axios');
const supabase = require('./supabaseClient');
const { logInfo, logError } = require('./logger');
const API_BASE_URL = process.env.VITE_API_BASE_URL;
const WS_BASE_URL = process.env.VITE_WS_BASE_URL;
const keywordReplyService = require('./keywordReplyService');
const aiModelService = require('./aiModelService');
const pluginService = require('./pluginService');
const cache = require('./cache');
const db = require('./db');

class WebSocketService {
  constructor() {
    this.connections = new Map();
    this.retryAttempts = new Map();
    this.maxRetries = 10;
    this.retryDelays = [1000, 2000, 5000, 10000, 30000, 60000, 120000, 300000, 600000, 1800000];
    this.connectionLocks = new Map();
    this.heartbeatInterval = null;
    this.cache = {
      botInfo: new Map(),
      aiModels: new Map(),
      keywordReplies: new Map(),
      plugins: new Map(),
      context: new Map(),
      cacheExpiration: 5 * 60 * 1000
    };
    this.requestCache = new Map();
    this.memoryContext = new Map(); // 轮对结构：每轮{user, assistant}
  }

  async initialize() {
    try {
      logInfo('正在初始化WebSocket服务...');
      logInfo('正在连接数据库...');
      const users = await db.getBotsOnline(); // 示例，实际应有 getUsers
      logInfo('数据库连接成功，当前用户总数:', users?.length || 0);
      const bots = await db.getBotsOnline();
      logInfo(`找到 ${bots?.length || 0} 个在线机器人`);
      if (bots?.length > 0) {
        logInfo('机器人列表:');
        bots.forEach(bot => {
          logInfo(`- ID: ${bot.id}, 用户ID: ${bot.user_id}, 状态: ${bot.status}, AuthKey: ${bot.auth_key}`);
        });
      } else {
        logInfo('SQL查询:', "SELECT * FROM bots WHERE status = 'online'");
        const { data: allBots } = await supabase.from('bots').select('status, user_id');
        const statusCount = allBots?.reduce((acc, bot) => {
          acc[bot.status] = (acc[bot.status] || 0) + 1;
          return acc;
        }, {});
        logInfo('所有机器人状态分布:', statusCount);
        logInfo('用户ID分布:', [...new Set(allBots?.map(bot => bot.user_id) || [])]);
      }
      for (const bot of (bots || [])) {
        logInfo(`正在为机器人 ${bot.id} (用户ID: ${bot.user_id}) 建立连接...`);
        this.connect(bot.auth_key, bot.id);
      }
      logInfo('正在设置数据库变化监听...');
      this.subscribeToBotsChanges();
      logInfo('数据库变化监听设置完成');
      this.startHeartbeat();
    } catch (error) {
      logError('初始化WebSocket服务失败:', error);
      if (error.stack) {
        logError('错误堆栈:', error.stack);
      }
      process.exit(1);
    }
  }

  startHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    this.heartbeatInterval = setInterval(() => {
      this.connections.forEach((connection, botId) => {
        if (connection.ws.readyState === WebSocket.OPEN) {
          try {
            connection.ws.send('ping');
          } catch (error) {
            logError(`发送心跳到机器人 ${botId} 失败:`, error);
            this.reconnect(botId, connection.authKey);
          }
        } else if (connection.ws.readyState !== WebSocket.CONNECTING) {
          logInfo(`检测到机器人 ${botId} 连接状态异常 (${connection.ws.readyState})，尝试重连`);
          this.reconnect(botId, connection.authKey);
        }
      });
    }, 25000);
    logInfo('心跳机制已启动');
  }

  subscribeToBotsChanges() {
    const botsSubscription = supabase
      .channel('bots_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'bots'
      }, async (payload) => {
        try {
          const bot = payload.new;
          if (payload.eventType === 'UPDATE') {
            if (bot.status === 'online' && !this.connections.has(bot.id)) {
              logInfo(`机器人 ${bot.id} 上线，建立连接`);
              this.connect(bot.auth_key, bot.id);
            } else if (bot.status !== 'online' && this.connections.has(bot.id)) {
              logInfo(`机器人 ${bot.id} 下线，断开连接`);
              this.disconnect(bot.id);
            }
          } else if (payload.eventType === 'DELETE' && this.connections.has(bot.id)) {
            logInfo(`机器人 ${bot.id} 被删除，断开连接`);
            this.disconnect(bot.id);
          }
        } catch (error) {
          logError('处理机器人状态变化失败:', error);
        }
      })
      .subscribe();
  }

  async canEstablishConnection(botId) {
    if (this.connectionLocks.get(botId)) {
      logInfo(`机器人 ${botId} 正在建立连接，跳过重复连接请求`);
      return false;
    }
    if (this.connections.has(botId)) {
      const existingConnection = this.connections.get(botId);
      if (existingConnection.ws.readyState === WebSocket.OPEN) {
        logInfo(`机器人 ${botId} 已有活跃连接，断开旧连接`);
        await this.disconnect(botId);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    return true;
  }

  async connect(authKey, botId) {
    if (!authKey || !botId) return;
    try {
      if (!await this.canEstablishConnection(botId)) {
        return;
      }
      this.connectionLocks.set(botId, true);
      const retryCount = this.retryAttempts.get(botId) || 0;
      if (retryCount >= this.maxRetries) {
        logError(`机器人 ${botId} 连接失败次数过多，停止重试`);
        await this.updateBotStatus(botId, 'offline');
        this.connectionLocks.delete(botId);
        return;
      }
      logInfo(`正在为机器人 ${botId} 建立WebSocket连接...`);
      await this.updateBotStatus(botId, 'online');
      const connectionTimeout = setTimeout(() => {
        if (this.connectionLocks.get(botId)) {
          logInfo(`机器人 ${botId} 连接超时，重新尝试...`);
          this.connectionLocks.delete(botId);
          this.reconnect(botId, authKey);
        }
      }, 15000);
      const ws = new WebSocket(`${WS_BASE_URL}/GetSyncMsg?key=${authKey}`);
      const connection = {
        ws,
        reconnectTimeout: null,
        lastMessageTime: Date.now(),
        authKey,
        pendingMessages: []
      };
      this.connections.set(botId, connection);
      if (connection.checkInterval) clearInterval(connection.checkInterval);
      connection.checkInterval = setInterval(() => {
        if (!ws || ws.readyState !== WebSocket.OPEN) {
          logInfo(`检测到机器人 ${botId} 连接不正常 (状态: ${ws?.readyState})，重连`);
          this.reconnect(botId, authKey);
          return;
        }
        if (Date.now() - connection.lastMessageTime > 60000) {
          logInfo(`检测到机器人 ${botId} 假死，主动断开重连`);
          ws.terminate && ws.terminate();
          this.reconnect(botId, authKey);
        }
      }, 10000);
      ws.on('open', async () => {
        logInfo(`机器人 ${botId} WebSocket连接成功`);
        clearTimeout(connectionTimeout);
        this.retryAttempts.delete(botId);
        this.connectionLocks.delete(botId);
        connection.lastMessageTime = Date.now();
        try {
          ws.send('ping');
        } catch (error) {
          logError(`向机器人 ${botId} 发送初始ping失败:`, error);
        }
        if (connection.pendingMessages.length > 0) {
          logInfo(`处理机器人 ${botId} 的 ${connection.pendingMessages.length} 条待发送消息`);
          for (const pendingMsg of connection.pendingMessages) {
            try {
              await this.sendMessage(
                authKey, 
                pendingMsg.toUser, 
                pendingMsg.content, 
                pendingMsg.shouldSplit, 
                pendingMsg.interval,
                pendingMsg.msgType
              );
            } catch (error) {
              logError(`发送待处理消息失败:`, error);
            }
          }
          connection.pendingMessages = [];
        }
      });
      ws.on('message', async (data) => {
        logInfo(`收到原始WebSocket消息: ${typeof data === 'string' ? data : data.toString('utf8')}`);
        connection.lastMessageTime = Date.now();
        const dataStr = data.toString();
        if (dataStr === 'pong') {
          return;
        }
        if (dataStr === 'ping') {
          try {
            ws.send('pong');
            return;
          } catch (error) {
            logError(`响应ping失败:`, error);
            return;
          }
        }
        try {
          const startTime = Date.now();
          const message = JSON.parse(dataStr);
          await Promise.all([
            this.handleMessage(message, botId, authKey)
          ]);
          const processingTime = Date.now() - startTime;
        } catch (error) {
          logError('处理消息失败:', error);
          if (error.stack) {
            logError('错误堆栈:', error.stack);
          }
        }
      });
      ws.on('close', async (code, reason) => {
        clearTimeout(connectionTimeout);
        logInfo(`机器人 ${botId} WebSocket连接关闭，代码: ${code}, 原因: ${reason}`);
        await this.updateBotStatus(botId, 'offline');
        this.cleanup(botId);
        this.reconnect(botId, authKey);
      });
      ws.on('error', async (error) => {
        clearTimeout(connectionTimeout);
        logError(`机器人 ${botId} WebSocket错误:`, error);
        await this.updateBotStatus(botId, 'error');
        if (ws.readyState !== WebSocket.CLOSED) ws.terminate && ws.terminate();
        this.reconnect(botId, authKey);
      });
    } catch (error) {
      logError(`创建机器人 ${botId} WebSocket连接失败:`, error);
      await this.updateBotStatus(botId, 'error');
      this.connectionLocks.delete(botId);
      this.reconnect(botId, authKey);
    }
  }

  async handleMessage(message, botId, authKey) {
    const startTime = Date.now();
    if (!message?.from_user_name?.str) {
      if (typeof this.logInfo === 'function') this.logInfo('无效的消息格式:', message);
      return;
    }
    const fromUser = message.from_user_name.str;
    const isGroupMessage = fromUser.includes('@chatroom');
    let content = message.content?.str || '';
    let msgType = 'text';
    if (message.msg_type === 3) {
      msgType = 'image';
      content = message.image?.image_url || '';
    } else if (message.msg_type === 34) {
      msgType = 'voice';
      content = message.voice?.voice_url || '';
    }
    if (typeof this.logInfo === 'function') {
      this.logInfo(`收到消息 - 机器人${botId}:`);
      this.logInfo(`- 发送者: ${fromUser}`);
      this.logInfo(`- 消息类型: ${isGroupMessage ? '群聊' : '私聊'} (${msgType})`);
      this.logInfo(`- 内容: ${content}`);
    }
    try {
      let parsedSender = '';
      let parsedContent = content;
      if (isGroupMessage && content.includes(':') && msgType === 'text') {
        const match = content.match(/^([^:]+):\s*(.*)$/s);
        if (match) {
          parsedSender = match[1];
          parsedContent = match[2].trim();
        }
      }
      let contextCount = 5; // 默认
      let aiModels = [];
      let matchedModel = null;
      let userId = null;
      let botInfo = null;
      if (msgType === 'text') {
        botInfo = await db.getBotInfo(botId);
        if (botInfo) {
          userId = botInfo.user_id;
          aiModels = await db.getAIModels(userId);
          matchedModel = aiModels.find(model =>
            parsedContent.toLowerCase().startsWith(model.trigger_prefix.toLowerCase()) &&
            !model.block_list.includes(fromUser) &&
            !(model.send_type === 'private' && isGroupMessage) &&
            !(model.send_type === 'group' && !isGroupMessage) &&
            !(model.send_type === 'group' && isGroupMessage && !model.group_whitelist.includes('all') && !model.group_whitelist.includes(fromUser))
          );
          if (matchedModel && matchedModel.context_count) {
            contextCount = matchedModel.context_count;
          } else if (aiModels[0] && aiModels[0].context_count) {
            contextCount = aiModels[0].context_count;
          }
        }
      }
      if (isGroupMessage && botInfo?.at_reply_enabled === 1) {
        if (!message.push_content) {
          if (typeof this.logInfo === 'function') this.logInfo('群聊未被@，跳过AI回复');
          return;
        }
      }
      await Promise.all([
        this.recordMessage(botId, message, fromUser, parsedSender, parsedContent, msgType, content),
        (async () => {
          if (msgType === 'text') {
            const [keywordReplies, plugins] = await Promise.all([
              db.getKeywordReplies(userId),
              db.getPlugins(userId)
            ]);
            const context = {
              message,
              botId,
              userId,
              authKey,
              cache,
              db,
              logInfo,
              logError,
              sendMessage: this.sendMessage.bind(this),
              isGroupMessage,
              content: parsedContent,
              fromUser,
              botInfo,
              getContext: this.getContext?.bind(this),
              callAIModel: this.callAIModel?.bind(this),
              requestCache: this.requestCache,
              makeRequest: this.makeRequest?.bind(this),
              keywordReplies,
              aiModels,
              plugins,
              pushMemoryContext: (botId, fromUser, msg) => this.pushMemoryContext(botId, fromUser, msg, contextCount),
              wsService: this
            };
            const results = await Promise.allSettled([
              pluginService.process(context),
              aiModelService.process(context),
              keywordReplyService.process(context)
            ]);
            if (results[0].status === 'fulfilled' && results[0].value === true) {
              if (typeof this.logInfo === 'function') this.logInfo(`插件成功处理了消息，跳过其他处理`);
              return;
            }
          }
        })()
      ]);
      const processingTime = Date.now() - startTime;
    } catch (error) {
      if (typeof this.logError === 'function') this.logError('处理消息失败:', error);
      const processingTime = Date.now() - startTime;
      if (typeof this.logError === 'function') this.logError(`消息处理失败，耗时: ${processingTime}ms`);
    }
  }

  async recordMessage(botId, message, fromUser, parsedSender, parsedContent, msgType, content) {
    try {
      await supabase.from('bot_messages').insert([{
        bot_id: botId,
        msg_id: message.msg_id,
        from_user: message.from_user_name.str.includes('@chatroom') ? parsedSender || fromUser : fromUser,
        to_user: message.to_user_name.str,
        msg_type: message.msg_type,
        content: parsedContent,
        media_url: msgType !== 'text' ? content : null,
        status: message.status,
        created_at: new Date(message.create_time * 1000).toISOString(),
        source: message.msg_source
      }]);
    } catch (error) {
      logError('记录消息失败:', error);
    }
  }

  async getBotInfo(botId) {
    const cacheKey = `bot_${botId}`;
    const cachedInfo = this.cache.botInfo.get(cacheKey);
    if (cachedInfo && (Date.now() - cachedInfo.timestamp) < this.cache.cacheExpiration) {
      return cachedInfo.data;
    }
    try {
      const { data: bot, error: botError } = await supabase.from('bots').select('user_id, at_reply_enabled, wxid, nickname').eq('id', botId).single();
      if (botError) {
        logError('获取机器人信息失败:', botError);
        return null;
      }
      this.cache.botInfo.set(cacheKey, {
        data: bot,
        timestamp: Date.now()
      });
      return bot;
    } catch (error) {
      logError('获取机器人信息异常:', error);
      return null;
    }
  }

  async getAIModels(botId) {
    try {
      const bot = await this.getBotInfo(botId);
      if (!bot?.user_id) return [];
      const cacheKey = `aimodels_${bot.user_id}`;
      const cachedModels = this.cache.aiModels.get(cacheKey);
      if (cachedModels && (Date.now() - cachedModels.timestamp) < this.cache.cacheExpiration) {
        return cachedModels.data;
      }
      const { data: aiModels, error: modelError } = await supabase.from('ai_models').select('*').eq('user_id', bot.user_id).eq('enabled', true);
      if (modelError) {
        logError('获取AI模型配置失败:', modelError);
        return [];
      }
      this.cache.aiModels.set(cacheKey, {
        data: aiModels || [],
        timestamp: Date.now()
      });
      return aiModels || [];
    } catch (error) {
      logError('获取AI模型配置异常:', error);
      return [];
    }
  }

  async getKeywordReplies(botId) {
    try {
      const bot = await this.getBotInfo(botId);
      if (!bot?.user_id) return [];
      const cacheKey = `keywordreplies_${bot.user_id}`;
      const cachedReplies = this.cache.keywordReplies.get(cacheKey);
      if (cachedReplies && (Date.now() - cachedReplies.timestamp) < this.cache.cacheExpiration) {
        return cachedReplies.data;
      }
      const { data: replies, error } = await supabase.from('keyword_replies').select('*').eq('user_id', bot.user_id).eq('is_active', true);
      if (error) {
        logError('获取关键词回复配置失败:', error);
        return [];
      }
      this.cache.keywordReplies.set(cacheKey, {
        data: replies || [],
        timestamp: Date.now()
      });
      return replies || [];
    } catch (error) {
      logError('获取关键词回复配置异常:', error);
      return [];
    }
  }

  async getPlugins(botId) {
    try {
      const bot = await this.getBotInfo(botId);
      if (!bot?.user_id) return [];
      const cacheKey = `plugins_${bot.user_id}`;
      const cachedPlugins = this.cache.plugins.get(cacheKey);
      if (cachedPlugins && (Date.now() - cachedPlugins.timestamp) < this.cache.cacheExpiration) {
        return cachedPlugins.data;
      }
      const { data: plugins, error } = await supabase.from('plugins').select('*').eq('user_id', bot.user_id).eq('is_active', true);
      if (error) {
        logError('获取插件配置失败:', error);
        return [];
      }
      this.cache.plugins.set(cacheKey, {
        data: plugins || [],
        timestamp: Date.now()
      });
      return plugins || [];
    } catch (error) {
      logError('获取插件配置异常:', error);
      return [];
    }
  }

  async processAIResponse(aiModels, message, botId, authKey, content, fromUser, isGroupMessage, botInfo) {
    if (!aiModels?.length) return false;
    const startTime = Date.now();
    try {
      const matchedModel = aiModels.find(model => 
        content.toLowerCase().startsWith(model.trigger_prefix.toLowerCase()) &&
        !model.block_list.includes(fromUser) &&
        !(model.send_type === 'private' && isGroupMessage) &&
        !(model.send_type === 'group' && !isGroupMessage) &&
        !(model.send_type === 'group' && !model.group_whitelist.includes('all') && !model.group_whitelist.includes(fromUser)) &&
        Math.random() * 100 <= model.reply_probability
      );
      if (!matchedModel) return false;
      const triggerPrefix = matchedModel.trigger_prefix.toLowerCase();
      const userMessage = content.slice(triggerPrefix.length).trim();
      if (!userMessage) return false;
      logInfo(`处理AI响应 - 匹配模型: ${matchedModel.name}`);
      logInfo(`上下文消息数量配置: ${matchedModel.context_count}`);
      let context = [];
      if (matchedModel.context_count > 0) {
        logInfo(`开始获取上下文消息，限制 ${matchedModel.context_count} 条`);
        try {
          const cacheKey = `context_${botId}_${fromUser}_${isGroupMessage ? 'group' : 'private'}`;
          const cachedContext = this.cache.context?.get(cacheKey);
          if (cachedContext && (Date.now() - cachedContext.timestamp) < 30000) {
            logInfo(`使用缓存的上下文消息，共 ${cachedContext.data.length} 条`);
            context = [...cachedContext.data];
          } else {
            const historyStartTime = Date.now();
            let query = require('./supabaseClient').from('bot_messages').select('*').eq('bot_id', botId);
            if (isGroupMessage) {
              query = query.eq('to_user', fromUser);
            } else {
              query = query.or(`from_user.eq.${fromUser},to_user.eq.${fromUser}`);
            }
            const { data: history, error } = await query.order('created_at', { ascending: false }).limit(matchedModel.context_count * 3);
            logInfo(`获取上下文消息查询耗时: ${Date.now() - historyStartTime}ms`);
            if (error) {
              logError('获取上下文消息失败:', error);
              logError('执行的SQL查询:', query);
            } else if (history && history.length > 0) {
              logInfo(`成功获取 ${history.length} 条上下文消息`);
              logInfo(`上下文消息来源:`, history.map(h => ({ from: h.from_user, to: h.to_user, content: h.content?.substring(0, 20) })));
              const sortedHistory = [...history].sort((a, b) => {
                return new Date(a.created_at) - new Date(b.created_at);
              });
              const formattedContext = [];
              let messagesCount = 0;
              for (const msg of sortedHistory) {
                if (msg.msg_type === 1 || msg.msg_type === 0) {
                  const role = msg.from_user === 'assistant' ? 'assistant' : 'user';
                  let messageContent = msg.content || '';
                  if (role === 'user' && messageContent.toLowerCase().startsWith(triggerPrefix.toLowerCase())) {
                    messageContent = messageContent.slice(triggerPrefix.length).trim();
                  }
                  if (messageContent) {
                    formattedContext.push({
                      role: role,
                      content: messageContent
                    });
                    messagesCount++;
                    if (messagesCount >= matchedModel.context_count) break;
                  }
                }
              }
              context = formattedContext;
              if (!this.cache.context) {
                this.cache.context = new Map();
              }
              this.cache.context.set(cacheKey, {
                data: context,
                timestamp: Date.now()
              });
              logInfo('上下文消息内容:');
              context.forEach((ctx, idx) => {
                logInfo(`- [${idx}] ${ctx.role}: ${ctx.content.substring(0, 30)}${ctx.content.length > 30 ? '...' : ''}`);
              });
            }
          }
        } catch (contextError) {
          logError('处理上下文消息时出错:', contextError);
          logError('错误堆栈:', contextError.stack);
          context = [];
        }
        logInfo(`最终使用 ${context.length} 条上下文消息`);
      }
      let systemPrompt = matchedModel.system_prompt;
      const now = new Date();
      const replacements = {
        '[time]': now.toLocaleString(),
        '[date]': now.toLocaleDateString(),
        '[year]': now.getFullYear().toString(),
        '[month]': (now.getMonth() + 1).toString(),
        '[day]': now.getDate().toString(),
        '[hour]': now.getHours().toString(),
        '[minute]': now.getMinutes().toString(),
        '[second]': now.getSeconds().toString(),
        '[发送人id]': fromUser,
        '[发送人昵称]': message.parsed_sender || fromUser,
        '[群号]': isGroupMessage ? fromUser : '',
        '[消息类型]': isGroupMessage ? '群聊' : '私聊',
        '[触发前缀]': matchedModel.trigger_prefix,
        '[模型名称]': matchedModel.name
      };
      Object.entries(replacements).forEach(([key, value]) => {
        systemPrompt = systemPrompt.replace(new RegExp(key, 'g'), value);
      });
      logInfo(`调用AI模型: ${matchedModel.model}, 消息长度: ${userMessage.length}字符, 上下文消息数: ${context.length}`);
      logInfo('发送给模型的完整消息：', JSON.stringify({
        model: matchedModel.model,
        system_prompt: systemPrompt,
        context: context,
        user_message: userMessage
      }, null, 2));
      const aiResponse = await this.callAIModel(authKey, {
        ...matchedModel,
        system_prompt: systemPrompt
      }, userMessage, context);
      if (matchedModel.enable_split_send) {
        const segments = aiResponse.split(/[。！？]/).filter(segment => segment.trim());
        for (const segment of segments) {
          await this.sendMessage(authKey, fromUser, segment.trim());
        }
      } else {
        await this.sendMessage(authKey, fromUser, aiResponse);
      }
      try {
        await supabase.from('bot_messages').insert([{
          bot_id: botId,
          msg_id: `user_message_${Date.now()}`,
          from_user: fromUser,
          to_user: fromUser.includes('@chatroom') ? botId : fromUser,
          msg_type: 1,
          content: content,
          media_url: null,
          status: 2,
          created_at: new Date().toISOString(),
          source: 'user_message'
        }]);
        await supabase.from('bot_messages').insert([{
          bot_id: botId,
          msg_id: `ai_reply_${Date.now()}`,
          from_user: 'assistant',
          to_user: fromUser,
          msg_type: 1,
          content: aiResponse,
          media_url: null,
          status: 2,
          created_at: new Date().toISOString(),
          source: 'ai_response'
        }]);
        logInfo('用户消息和AI回复已保存到数据库，用于上下文');
        const cacheKey = `context_${botId}_${fromUser}_${isGroupMessage ? 'group' : 'private'}`;
        const cachedContext = this.cache.context?.get(cacheKey);
        if (cachedContext) {
          const updatedContext = [...cachedContext.data];
          updatedContext.push({
            role: 'user',
            content: userMessage
          });
          updatedContext.push({
            role: 'assistant',
            content: aiResponse
          });
          while (updatedContext.length > matchedModel.context_count) {
            updatedContext.shift();
          }
          this.cache.context.set(cacheKey, {
            data: updatedContext,
            timestamp: Date.now()
          });
          logInfo(`更新上下文缓存，现有 ${updatedContext.length} 条消息`);
          logInfo('更新后的上下文消息:');
          updatedContext.forEach((ctx, idx) => {
            logInfo(`- [${idx}] ${ctx.role}: ${ctx.content.substring(0, 30)}${ctx.content.length > 30 ? '...' : ''}`);
          });
        } else {
          const newContext = [
            {
              role: 'user',
              content: userMessage
            },
            {
              role: 'assistant',
              content: aiResponse
            }
          ];
          if (!this.cache.context) {
            this.cache.context = new Map();
          }
          this.cache.context.set(cacheKey, {
            data: newContext,
            timestamp: Date.now()
          });
          logInfo(`创建新的上下文缓存，包含 ${newContext.length} 条消息`);
        }
      } catch (saveError) {
        logError('保存对话记录到数据库失败:', saveError);
      }
      const processingTime = Date.now() - startTime;
      logInfo(`AI响应处理完成，耗时: ${processingTime}ms`);
      return true;
    } catch (error) {
      logError('处理AI响应失败:', error);
      const processingTime = Date.now() - startTime;
      logError(`AI响应处理失败，耗时: ${processingTime}ms`);
      return false;
    }
  }

  async processKeywordReply(keywordReplies, message, botId, authKey, content, fromUser, isGroupMessage) {
    if (!keywordReplies?.length) return false;
    const startTime = Date.now();
    try {
      for (const reply of keywordReplies) {
        if (
          reply.scope !== 'all' &&
          ((reply.scope === 'private' && isGroupMessage) ||
          (reply.scope === 'group' && !isGroupMessage))
        ) {
          continue;
        }
        let isMatch = false;
        switch (reply.match_type) {
          case 'exact':
            isMatch = content === reply.keyword;
            break;
          case 'fuzzy':
            isMatch = content.toLowerCase().includes(reply.keyword.toLowerCase());
            break;
          case 'regex':
            try {
              const regex = new RegExp(reply.keyword, 'i');
              isMatch = regex.test(content);
            } catch (error) {
              logError('无效的正则表达式:', error);
            }
            break;
        }
        if (isMatch) {
          logInfo(`关键词匹配成功: ${reply.keyword}`);
          try {
            switch (reply.reply_type) {
              case 'text':
                await this.sendMessage(authKey, fromUser, reply.reply);
                break;
              case 'image':
                await this.sendMessage(authKey, fromUser, reply.reply, false, 0, 'image');
                break;
              case 'voice':
                await this.sendMessage(authKey, fromUser, reply.reply, false, 0, 'voice');
                break;
            }
            const processingTime = Date.now() - startTime;
            logInfo(`关键词回复处理完成，耗时: ${processingTime}ms`);
            return true;
          } catch (error) {
            logError('发送关键词回复失败:', error);
          }
        }
      }
      return false;
    } catch (error) {
      logError('处理关键词回复失败:', error);
      const processingTime = Date.now() - startTime;
      logError(`关键词回复处理失败，耗时: ${processingTime}ms`);
      return false;
    }
  }

  async processPluginResponse(plugins, message, botId, authKey, content, fromUser, isGroupMessage) {
    if (!plugins?.length) return false;
    const startTime = Date.now();
    try {
      const pluginMatchPromises = plugins.map(async (plugin) => {
        const triggerPattern = plugin.trigger.endsWith('?') 
          ? plugin.trigger.slice(0, -1) 
          : plugin.trigger;
        const hasParams = plugin.trigger.endsWith('?');
        const messageContent = content.trim();
        let isMatch = false;
        let params = '';
        if (hasParams) {
          if (messageContent.startsWith(triggerPattern)) {
            isMatch = true;
            params = messageContent.slice(triggerPattern.length).trim();
          }
        } else {
          isMatch = messageContent === triggerPattern;
        }
        return { plugin, isMatch, params };
      });
      const pluginMatches = await Promise.all(pluginMatchPromises);
      const matchedPlugin = pluginMatches.find(match => match.isMatch);
      if (matchedPlugin) {
        const { plugin, params } = matchedPlugin;
        logInfo(`插件触发匹配: ${plugin.trigger}`);
        const pluginStartTime = Date.now();
        const sandbox = {
          sendText: async (text) => {
            await this.sendMessage(authKey, fromUser, String(text));
          },
          sendImage: async (url) => {
            try {
              if (/^https?:\/\//.test(url)) {
                let imageData;
                const cacheKey = `image_${url}`;
                const cachedImage = this.requestCache.get(cacheKey);
                if (cachedImage && (Date.now() - cachedImage.timestamp) < 60000) {
                  imageData = cachedImage.data;
                } else {
                  logInfo(`获取图片: ${url}`);
                  const imageStartTime = Date.now();
                  const response = await fetch(url);
                  const buffer = await response.arrayBuffer();
                  const base64 = Buffer.from(buffer).toString('base64');
                  imageData = `data:image/jpeg;base64,${base64}`;
                  this.requestCache.set(cacheKey, {
                    data: imageData,
                    timestamp: Date.now()
                  });
                  logInfo(`获取图片完成，耗时: ${Date.now() - imageStartTime}ms`);
                }
                await this.sendMessage(authKey, fromUser, imageData, false, 0, 'image');
              } else {
                await this.sendMessage(authKey, fromUser, url, false, 0, 'image');
              }
            } catch (error) {
              logError('发送图片失败:', error);
              await this.sendMessage(authKey, fromUser, '发送图片失败，请检查图片URL是否正确');
            }
          },
          sendVoice: async (url) => {
            await this.sendMessage(authKey, fromUser, url, false, 0, 'voice');
          },
          request: async (options) => {
            const requestStartTime = Date.now();
            logInfo(`插件API请求: ${options.url}`);
            if (options.method?.toUpperCase() === 'GET' || !options.method) {
              const cacheKey = `request_${options.url}`;
              const cachedResponse = this.requestCache.get(cacheKey);
              if (cachedResponse && (Date.now() - cachedResponse.timestamp) < 60000) {
                logInfo(`使用缓存的API响应: ${options.url}`);
                return cachedResponse.data;
              }
            }
            try {
              const response = await this.makeRequest(options);
              if (options.method?.toUpperCase() === 'GET' || !options.method) {
                this.requestCache.set(`request_${options.url}`, {
                  data: response,
                  timestamp: Date.now()
                });
              }
              logInfo(`插件API请求完成，耗时: ${Date.now() - requestStartTime}ms`);
              return response;
            } catch (error) {
              logError(`插件API请求失败:`, error);
              logError(`插件API请求失败，耗时: ${Date.now() - requestStartTime}ms`);
              throw error;
            }
          },
          param: (index) => {
            if (!params) return '';
            const parts = params.split(/\s+/);
            return parts[index - 1] || '';
          },
          getUserId: () => message.from_user_name?.str || '',
          getChatId: () => message.to_user_name?.str || '',
          getSenderName: () => message.from_user_name?.str?.split('@')[0] || '',
          isPrivateChat: () => !message.from_user_name?.str?.includes('@chatroom'),
          isGroupChat: () => message.from_user_name?.str?.includes('@chatroom'),
          getMessageType: () => message.msg_type,
          filterEmoji: (text) => text.replace(/[\uD83C-\uDBFF\uDC00-\uDFFF]+/g, ''),
          encodeURIComponent,
          decodeURIComponent,
          formatDate: (date, format) => {
            const pad = (n) => n < 10 ? '0' + n : n;
            return format
              .replace('YYYY', String(date.getFullYear()))
              .replace('MM', pad(date.getMonth() + 1))
              .replace('DD', pad(date.getDate()))
              .replace('HH', pad(date.getHours()))
              .replace('mm', pad(date.getMinutes()))
              .replace('ss', pad(date.getSeconds()));
          },
          random: (min, max) => Math.floor(Math.random() * (max - min + 1)) + min,
          sleep: (ms) => new Promise(resolve => setTimeout(resolve, ms))
        };
        try {
          const fn = new Function('sandbox', `
            with (sandbox) {
              return (async () => {
                try {
                  ${plugin.code}
                  return await main();
                } catch (error) {
                  logError("插件执行错误:", error);
                  sendText("插件执行错误: " + error.message);
                  return false;
                }
              })();
            }
          `);
          await fn(sandbox);
          const pluginProcessingTime = Date.now() - pluginStartTime;
          logInfo(`插件代码执行完成，耗时: ${pluginProcessingTime}ms`);
          const totalProcessingTime = Date.now() - startTime;
          logInfo(`插件响应处理完成，耗时: ${totalProcessingTime}ms`);
          return true;
        } catch (error) {
          logError("插件执行失败:", error);
          await this.sendMessage(authKey, fromUser, `插件执行失败: ${error instanceof Error ? error.message : '未知错误'}`);
          const processingTime = Date.now() - startTime;
          logError(`插件执行失败，耗时: ${processingTime}ms`);
          return true;
        }
      }
      return false;
    } catch (error) {
      logError('处理插件响应失败:', error);
      const processingTime = Date.now() - startTime;
      logError(`插件响应处理失败，耗时: ${processingTime}ms`);
      return false;
    }
  }

  async makeRequest(options) {
    const {
      url,
      method = 'GET',
      headers = {},
      data,
      timeout = 30000,
      dataType = 'text',
      retries = 2
    } = options;
    if (!url) {
      throw new Error('请求URL不能为空');
    }
    let lastError;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const requestStartTime = Date.now();
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        const defaultHeaders = {
          'Accept': '*/*',
          'Accept-Encoding': 'gzip,deflate',
          'Accept-Language': 'zh-CN,zh;q=0.8',
          'Connection': 'keep-alive',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          ...headers
        };
        const requestOptions = {
          method: method.toUpperCase(),
          headers: defaultHeaders,
          signal: controller.signal
        };
        if (data) {
          requestOptions.body = typeof data === 'string' ? data : JSON.stringify(data);
        }
        const response = await fetch(url, requestOptions);
        clearTimeout(timeoutId);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result = dataType === 'json' ? await response.json() : await response.text();
        logInfo(`请求完成: ${url}, 耗时: ${Date.now() - requestStartTime}ms`);
        return result;
      } catch (error) {
        lastError = error;
        if (error.name === 'AbortError') {
          logError(`请求超时: ${url}, 尝试: ${attempt + 1}/${retries + 1}`);
        } else {
          logError(`请求失败: ${url}, 尝试: ${attempt + 1}/${retries + 1}`, error);
        }
        if (attempt === retries) {
          throw error;
        }
        const retryDelay = Math.min(1000 * Math.pow(2, attempt), 10000);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
    throw lastError;
  }

  async updateBotStatus(botId, status) {
    try {
      const { error } = await supabase.from('bots').update({ 
        status,
        last_active_at: new Date().toISOString()
      }).eq('id', botId);
      if (error) throw error;
    } catch (error) {
      logError('更新机器人状态失败:', error);
    }
  }

  reconnect(botId, authKey) {
    if (this.connectionLocks.get(botId)) {
      logInfo(`机器人 ${botId} 正在重连中，跳过重复重连请求`);
      return;
    }
    const currentRetries = this.retryAttempts.get(botId) || 0;
    if (currentRetries >= this.maxRetries) {
      logInfo(`机器人 ${botId} 达到最大重试次数，停止重连`);
      return;
    }
    const delay = this.retryDelays[currentRetries] || 30000;
    this.retryAttempts.set(botId, currentRetries + 1);
    logInfo(`机器人 ${botId} 将在 ${delay/1000} 秒后重连... (第 ${currentRetries + 1} 次重试)`);
    if (this.connections.has(botId)) {
      const connection = this.connections.get(botId);
      if (connection.reconnectTimeout) clearTimeout(connection.reconnectTimeout);
      connection.reconnectTimeout = setTimeout(() => {
        this.connect(authKey, botId);
      }, delay);
    } else {
      setTimeout(() => {
        this.connect(authKey, botId);
      }, delay);
    }
  }

  disconnect(botId) {
    logInfo(`正在断开机器人 ${botId} 的连接...`);
    this.cleanup(botId);
    this.connectionLocks.delete(botId);
  }

  cleanup(botId) {
    const connection = this.connections.get(botId);
    if (connection) {
      clearInterval(connection.checkInterval);
      if (connection.reconnectTimeout) {
        clearTimeout(connection.reconnectTimeout);
      }
      if (connection.ws.readyState === WebSocket.OPEN) {
        connection.ws.close();
      }
      this.connections.delete(botId);
    }
  }

  async sendMessage(authKey, toUser, content, shouldSplit = false, interval = 1000, msgType = 'text') {
    try {
      logInfo(`发送${msgType}消息到 ${toUser}`);
      logInfo(`- 内容: ${content}`);
      let botId = null;
      for (const [id, connection] of this.connections.entries()) {
        if (connection.authKey === authKey) {
          botId = id;
          break;
        }
      }
      if (botId && this.connections.has(botId)) {
        const connection = this.connections.get(botId);
        if (connection.ws.readyState !== WebSocket.OPEN) {
          logInfo(`机器人 ${botId} 连接未就绪，消息添加到待发送队列`);
          connection.pendingMessages.push({
            toUser,
            content,
            shouldSplit,
            interval,
            msgType
          });
          return;
        }
      }
      if (msgType === 'text') {
        if (shouldSplit) {
          const segments = content.split(/[。！？]/).filter(segment => segment.trim());
          for (const segment of segments) {
            await this.sendRequest('/message/SendTextMessage', authKey, {
              MsgItem: [{
                AtWxIDList: [],
                ImageContent: "",
                MsgType: 0,
                TextContent: segment.trim(),
                ToUserName: toUser
              }]
            });
          }
        } else {
          await this.sendRequest('/message/SendTextMessage', authKey, {
            MsgItem: [{
              AtWxIDList: [],
              ImageContent: "",
              MsgType: 0,
              TextContent: content,
              ToUserName: toUser
            }]
          });
        }
      } else if (msgType === 'image') {
        await this.sendRequest('/message/SendImageNewMessage', authKey, {
          MsgItem: [{
            AtWxIDList: [],
            ImageContent: content,
            MsgType: 0,
            TextContent: "",
            ToUserName: toUser
          }]
        });
      } else if (msgType === 'voice') {
        await this.sendRequest('/message/SendVoice', authKey, {
          ToUserName: toUser,
          VoiceData: content,
          VoiceFormat: 0,
          VoiceSecond: 0
        });
      }
    } catch (error) {
      logError(`发送消息失败: ${error.message}`);
      throw error;
    }
  }

  async sendRequest(endpoint, authKey, data) {
    try {
      const baseUrl = API_BASE_URL;
      const url = `${baseUrl}${endpoint}?key=${authKey}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      const response = await axios.post(url, data, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'User-Agent': 'PostmanRuntime/7.36.0',
          'Connection': 'keep-alive'
        },
        signal: controller.signal,
        timeout: 30000,
        decompress: true
      });
      clearTimeout(timeoutId);
      logInfo(`API请求成功: ${endpoint}`);
      return response.data;
    } catch (error) {
      if (error.name === 'AbortError' || error.code === 'ECONNABORTED') {
        logError(`API请求超时: ${endpoint}`);
        throw new Error('请求超时');
      }
      if (error.response) {
        logError(`API请求失败 (${error.response.status}): ${endpoint}`);
        logError('请求数据:', JSON.stringify(data));
        logError('响应数据:', error.response.data);
        logError('请求头:', JSON.stringify(error.config.headers));
        if (error.response.status === 403) {
          try {
            logInfo(`收到403错误，尝试使用备用请求头重新请求`);
            const retryResponse = await axios.post(url, data, {
              headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko)',
                'Connection': 'keep-alive'
              },
              timeout: 30000
            });
            logInfo(`重试请求成功: ${endpoint}`);
            return retryResponse.data;
          } catch (retryError) {
            logError(`重试请求仍然失败:`, retryError.message);
            throw new Error(`API请求失败: ${error.response.status} ${error.response.statusText}`);
          }
        }
        throw new Error(`API请求失败: ${error.response.status} ${error.response.statusText}`);
      }
      logError(`API请求异常: ${endpoint}`, error.message);
      throw error;
    }
  }

  async callAIModel(authKey, modelConfig, message, context = []) {
    try {
      const baseUrl = modelConfig.base_url.replace(/\/$/, '');
      const endpoint = '/chat/completions';
      const url = `${baseUrl}${endpoint}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);
      logInfo(`调用AI模型: ${modelConfig.model}, 消息长度: ${message.length}字符`);
      const fixedSystemPrompt = modelConfig.system_prompt.replace(/(\[\w+\/\d+\/\d+ \d+:\d+:\d+)(\1)+/, '$1');
      const messages = [
        { 
          role: 'system', 
          content: fixedSystemPrompt
        }
      ];
      if (context && context.length > 0) {
        logInfo(`添加 ${context.length} 条上下文消息`);
        context.forEach((ctx, index) => {
          if (ctx && ctx.role && ctx.content) {
            messages.push({
              role: ctx.role,
              content: ctx.content
            });
            logInfo(`- 上下文[${index}]: ${ctx.role}: ${ctx.content.substring(0, 30)}${ctx.content.length > 30 ? '...' : ''}`);
          }
        });
      }
      messages.push({ role: 'user', content: message });
      logInfo(`最终发送给AI的消息数组长度: ${messages.length}`);
      // logInfo(`- 系统提示词: ${fixedSystemPrompt.substring(0, 50)}...`);
      // logInfo(`- 上下文消息: ${context.length} 条`);
      logInfo(`- 用户消息: ${message}`);
      const aiResponse = await axios.post(url, {
        model: modelConfig.model,
        messages: messages,
        temperature: 0.7,
        max_tokens: 1000
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${modelConfig.api_key}`,
          'Accept': 'application/json',
          'User-Agent': 'PostmanRuntime/7.36.0',
          'Connection': 'keep-alive'
        },
        signal: controller.signal,
        timeout: 60000,
        decompress: true
      });
      clearTimeout(timeoutId);
      if (!aiResponse.data?.choices?.[0]?.message?.content) {
        throw new Error('AI响应格式错误');
      }
      const response = aiResponse.data.choices[0].message.content;
      logInfo(`AI响应成功，响应长度: ${response.length}字符`);
      return response;
    } catch (error) {
      if (error.name === 'AbortError' || error.code === 'ECONNABORTED') {
        logError(`AI请求超时`);
        throw new Error('AI服务请求超时');
      }
      if (axios.isAxiosError(error)) {
        if (error.response) {
          logError(`AI请求失败 (${error.response.status})`);
          logError('响应数据:', error.response.data);
          switch (error.response.status) {
            case 401:
              throw new Error('API密钥无效，请检查配置');
            case 403:
              throw new Error('API权限不足，请检查配置');
            case 404:
              throw new Error('API端点不存在，请检查base_url配置');
            case 429:
              throw new Error('API调用次数超限');
            case 500:
              throw new Error('AI服务器内部错误');
            default:
              throw new Error(`AI服务错误: ${error.response.status}`);
          }
        } else if (error.code === 'ECONNABORTED') {
          throw new Error('AI服务请求超时');
        } else {
          logError(`AI请求连接错误:`, error.message);
          throw new Error('无法连接到AI服务器');
        }
      }
      logError(`AI请求其他错误:`, error);
      throw error;
    }
  }

  pushMemoryContext(botId, fromUser, msg, contextCount) {
    const key = `${botId}_${fromUser}`;
    if (!this.memoryContext.has(key)) this.memoryContext.set(key, []);
    const arr = this.memoryContext.get(key);
    if (msg.role === 'user') {
      // 如果上一轮还没有 assistant，则覆盖 user
      if (arr.length > 0 && arr[arr.length - 1].assistant === null) {
        arr[arr.length - 1].user = msg.content;
      } else {
        // 新开一轮
        arr.push({ user: msg.content, assistant: null });
      }
      // 超过 contextCount 轮，整体裁剪
      if (arr.length > contextCount) arr.shift();
    } else if (msg.role === 'assistant') {
      if (arr.length === 0) return;
      arr[arr.length - 1].assistant = msg.content;
    }
  }

  async getContext(botId, fromUser, isGroupMessage, contextCount, triggerPrefix) {
    const key = `${botId}_${fromUser}`;
    const arr = this.memoryContext.get(key) || [];
    // 只取最近 N-1 轮
    const rounds = arr.length > (contextCount - 1) ? arr.slice(-(contextCount - 1)) : arr;
    // 展平成 messages
    const messages = [];
    for (const round of rounds) {
      if (round.user) messages.push({ role: 'user', content: round.user });
      if (round.assistant) messages.push({ role: 'assistant', content: round.assistant });
    }
    return messages;
  }

  clearAllCache() {
    Object.values(this.cache).forEach(map => map && map.clear && map.clear());
    logInfo('所有缓存已手动清理');
  }
}

module.exports = WebSocketService; 