const log4js = require('log4js');

log4js.configure({
  appenders: {
    info: {
      type: 'dateFile',
      filename: 'logs/info.log',
      pattern: 'yyyy-MM-dd',
      daysToKeep: 1, // 只保留7天
      compress: true, // 压缩旧日志
      keepFileExt: true
    },
    error: {
      type: 'dateFile',
      filename: 'logs/error.log',
      pattern: 'yyyy-MM-dd',
      daysToKeep: 1, // 错误日志保留14天
      compress: true,
      keepFileExt: true
    },
    out: { type: 'stdout' }
  },
  categories: {
    default: { appenders: ['info', 'out'], level: 'info' },
    error: { appenders: ['error', 'out'], level: 'error' }
  }
});

const infoLogger = log4js.getLogger();
const errorLogger = log4js.getLogger('error');

function logInfo(...args) {
  infoLogger.info(...args);
}
function logError(...args) {
  errorLogger.error(...args);
}

module.exports = { logInfo, logError }; 