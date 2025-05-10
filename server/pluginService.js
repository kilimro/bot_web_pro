const sharp = require('sharp');
const axios = require('axios');
const FileType = require('file-type');

module.exports = {
  async process({ plugins, message, botId, authKey, cache, supabase, logInfo, logError, sendMessage, isGroupMessage, content, fromUser, requestCache, makeRequest, wsService }) {
    if (!plugins?.length) return false;
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
        const sandbox = {
          sendText: async (text) => {
            await sendMessage(authKey, fromUser, String(text));
          },
          sendImage: async (img) => {
            // 1. 网络图片URL
            if (typeof img === 'string' && /^https?:\/\//.test(img)) {
              try {
                const response = await axios.get(img, { responseType: 'arraybuffer', timeout: 15000 });
                img = Buffer.from(response.data);
              } catch (err) {
                logError('下载图片失败:', err);
                await sendMessage(authKey, fromUser, '图片下载失败');
                return;
              }
            }
            // 2. 二进制图片
            if (
              (typeof Buffer !== 'undefined' && img instanceof Buffer) ||
              (typeof Uint8Array !== 'undefined' && img instanceof Uint8Array) ||
              Object.prototype.toString.call(img) === '[object ArrayBuffer]'
            ) {
              let buffer = img;
              if (Object.prototype.toString.call(img) === '[object ArrayBuffer]') {
                buffer = Buffer.from(img);
              } else if (typeof Uint8Array !== 'undefined' && img instanceof Uint8Array) {
                buffer = Buffer.from(img.buffer, img.byteOffset, img.byteLength);
              }
              // 检测类型（兼容 file-type 所有主流版本）
              let mime = 'image/jpeg';
              let type = null;
              try {
                if (FileType.fileTypeFromBuffer) {
                  type = await FileType.fileTypeFromBuffer(buffer);
                } else if (typeof FileType.fromBuffer === 'function') {
                  type = await FileType.fromBuffer(buffer);
                } else if (typeof FileType === 'function') {
                  type = await FileType(buffer);
                }
                if (type && type.mime) mime = type.mime;
              } catch (e) {}
              const base64 = buffer.toString('base64');
              await sendMessage(authKey, fromUser, `data:${mime};base64,${base64}`, false, 0, 'image');
              return;
            }
            // 3. 已经是base64格式（带前缀）
            if (typeof img === 'string' && img.startsWith('data:image/')) {
              await sendMessage(authKey, fromUser, img, false, 0, 'image');
              return;
            }
            // 4. 其他情况直接发送
            await sendMessage(authKey, fromUser, img, false, 0, 'image');
          },
          sendVoice: async (url) => {
            await sendMessage(authKey, fromUser, url, false, 0, 'voice');
          },
          request: async (options) => {
            return await makeRequest(options);
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
          sleep: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
          logError
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
          return true;
        } catch (error) {
          logError("插件执行失败:", error);
          await sendMessage(authKey, fromUser, `插件执行失败: ${error instanceof Error ? error.message : '未知错误'}`);
          return true;
        }
      }
      // 内置"刷新配置"命令
      if (typeof content === 'string' && content.trim() === '刷新配置') {
        try {
          if (typeof wsService?.clearAllCache === 'function') {
            wsService.clearAllCache();
            await sendMessage(authKey, fromUser, '刷新成功');
          } else {
            await sendMessage(authKey, fromUser, '刷新失败');
          }
        } catch (e) {
          logError('刷新配置失败:', e);
          await sendMessage(authKey, fromUser, '刷新失败');
        }
        return true;
      }
      return false;
    } catch (error) {
      logError('处理插件响应失败:', error);
      return false;
    }
  }
}; 