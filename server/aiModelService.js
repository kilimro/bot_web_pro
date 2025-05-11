module.exports = {
  async process({ aiModels, message, botId, authKey, cache, supabase, logInfo, logError, sendMessage, isGroupMessage, content, fromUser, botInfo, getContext, callAIModel, pushMemoryContext }) {
    if (!aiModels?.length) {
      logInfo && logInfo('[AI模型] aiModels为空，无法处理');
      return false;
    }
    function normalizeSpaces(str) {
      return str.replace(/[\s\u00A0\u2000-\u200B\u3000]/g, ' ');
    }
    function parseArrayField(field) {
      if (Array.isArray(field)) return field;
      if (typeof field === 'string') {
        try {
          const arr = JSON.parse(field);
          if (Array.isArray(arr)) return arr;
        } catch (e) {}
      }
      return [];
    }
    let shouldReply = false;
    let matchedModel = null;
    let parsedContent = content;
    for (const model of aiModels) {
      const blockList = parseArrayField(model.block_list);
      const groupWhitelist = parseArrayField(model.group_whitelist);
      const atReplyEnabled = model.at_reply_enabled !== undefined ? Number(model.at_reply_enabled) : (botInfo?.at_reply_enabled !== undefined ? Number(botInfo.at_reply_enabled) : 0);
      if (blockList.includes(fromUser)) {
        continue;
      }
      if (model.send_type === 'private' && isGroupMessage) {
        continue;
      }
      if (model.send_type === 'group' && !isGroupMessage) {
        continue;
      }
      if (model.send_type === 'group' && isGroupMessage && groupWhitelist.length > 0 && !groupWhitelist.includes('all') && !groupWhitelist.includes(fromUser)) {
        continue;
      }
      if (isGroupMessage && atReplyEnabled === 1 && message.push_content) {
        logInfo && logInfo('[AI模型] 群聊被@，直接触发AI回复，选中模型:', model.name);
        matchedModel = model;
        shouldReply = true;
        break;
      }
      const normalizedContent = normalizeSpaces(parsedContent);
      const normalizedPrefix = normalizeSpaces(model.trigger_prefix);
      if (normalizedContent.toLowerCase().startsWith(normalizedPrefix.toLowerCase())) {
        logInfo && logInfo('[AI模型] 前缀命中，选中模型:', model.name);
        matchedModel = model;
        shouldReply = true;
        break;
      }
    }
    if (!shouldReply || !matchedModel) {
      return false;
    }
    try {
      const triggerPrefix = matchedModel.trigger_prefix.toLowerCase();
      let userMessage = content;
      if (!(isGroupMessage && (matchedModel.at_reply_enabled !== undefined ? Number(matchedModel.at_reply_enabled) : (botInfo?.at_reply_enabled !== undefined ? Number(botInfo.at_reply_enabled) : 0)) === 1 && message.push_content)) {
        userMessage = content.slice(triggerPrefix.length).trim();
        if (!userMessage) {
          return false;
        }
      }
      let contextArr = [];
      if (matchedModel.context_count > 0 && getContext) {
        contextArr = await getContext(botId, fromUser, isGroupMessage, matchedModel.context_count, triggerPrefix);
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
      const messages = [
        { role: 'system', content: systemPrompt },
        ...contextArr,
        { role: 'user', content: userMessage }
      ];
      // logInfo && logInfo('[AI模型] 调用AI模型:', matchedModel.name, 'userMessage:', userMessage);
      const aiResponse = await callAIModel(authKey, {
        ...matchedModel,
        system_prompt: systemPrompt
      }, userMessage, messages.slice(1));
      const enableSplitSend = matchedModel.enable_split_send === true || matchedModel.enable_split_send === 'true';
      if (enableSplitSend) {
        const segments = aiResponse.split(/[。！？]/).filter(segment => segment.trim());
        for (const segment of segments) {
          await sendMessage(authKey, fromUser, segment.trim());
        }
      } else {
        await sendMessage(authKey, fromUser, aiResponse);
      }
      if (typeof pushMemoryContext === 'function') {
        pushMemoryContext(botId, fromUser, { role: 'user', content: userMessage }, matchedModel.context_count);
        pushMemoryContext(botId, fromUser, { role: 'assistant', content: aiResponse }, matchedModel.context_count);
      }
      // logInfo && logInfo('[AI模型] AI回复流程结束');
      return true;
    } catch (error) {
      logError && logError('[AI模型] AI模型回复处理失败:', error);
      return false;
    }
  }
}; 