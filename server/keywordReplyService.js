module.exports = {
  async process({ keywordReplies, message, botId, authKey, cache, supabase, logInfo, logError, sendMessage, isGroupMessage, content, fromUser }) {
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
                await sendMessage(authKey, fromUser, reply.reply);
                break;
              case 'image':
                await sendMessage(authKey, fromUser, reply.reply, false, 0, 'image');
                break;
              case 'voice':
                await sendMessage(authKey, fromUser, reply.reply, false, 0, 'voice');
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
}; 