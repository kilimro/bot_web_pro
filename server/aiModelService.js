module.exports = {
  async process({ aiModels, message, botId, authKey, cache, supabase, logInfo, logError, sendMessage, isGroupMessage, content, fromUser, botInfo, getContext, callAIModel, pushMemoryContext }) {
    if (!aiModels?.length) return false;
    try {
      const matchedModel = aiModels.find(model => {
        if (model.block_list && model.block_list.includes(fromUser)) return false;
        if (model.send_type === 'private' && isGroupMessage) return false;
        if (model.send_type === 'group' && !isGroupMessage) return false;
        if (model.send_type === 'group' && isGroupMessage && model.group_whitelist && !model.group_whitelist.includes('all') && !model.group_whitelist.includes(fromUser)) return false;
        if (!content.toLowerCase().startsWith(model.trigger_prefix.toLowerCase())) return false;
        if (Math.random() * 100 > model.reply_probability) return false;
        return true;
      });
      if (!matchedModel) return false;
      const triggerPrefix = matchedModel.trigger_prefix.toLowerCase();
      const userMessage = content.slice(triggerPrefix.length).trim();
      if (!userMessage) return false;
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
      const aiResponse = await callAIModel(authKey, {
        ...matchedModel,
        system_prompt: systemPrompt
      }, userMessage, messages.slice(1));
      // 分段回复类型判断，兼容字符串和布尔
      const enableSplitSend = matchedModel.enable_split_send === true || matchedModel.enable_split_send === 'true';
      if (enableSplitSend) {
        const segments = aiResponse.split(/[。！？]/).filter(segment => segment.trim());
        for (const segment of segments) {
          await sendMessage(authKey, fromUser, segment.trim());
        }
      } else {
        await sendMessage(authKey, fromUser, aiResponse);
      }
      // 写入内存上下文缓存
      if (typeof pushMemoryContext === 'function') {
        pushMemoryContext(botId, fromUser, { role: 'user', content: userMessage }, matchedModel.context_count);
        pushMemoryContext(botId, fromUser, { role: 'assistant', content: aiResponse }, matchedModel.context_count);
      }
      return true;
    } catch (error) {
      if (typeof logError === 'function') logError('AI模型回复处理失败:', error);
      return false;
    }
  }
}; 