const WebSocket = require('ws');
const supabase = require('./supabaseClient');
const { logInfo, logError, systemLogs } = require('./logger');
const axios = require('axios');
const express = require('express');
const http = require('http');
const cors = require('cors');
const os = require('os'); // 引入os模块
const fs = require('fs');
const path = require('path');
require('dotenv').config();
require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });

// 配置
const WS_BASE_URL = process.env.VITE_WS_BASE_URL;
const API_BASE_URL = process.env.VITE_API_BASE_URL;
const PORT = process.env.PORT || 3031;

// 创建Express应用
const app = express();
app.use(cors()); // 允许所有跨域
const server = http.createServer(app);

// Express路由
app.get('/', (req, res) => {
  res.json({ code: 200, msg: '欢迎使用mianprobot' });
});
app.get('/wss_log', (req, res) => {
  const possiblePaths = [
    path.resolve(__dirname, '../logs/info.log'),
    path.resolve(__dirname, './logs/info.log'),
    path.resolve(process.cwd(), 'logs/info.log')
  ];
  let logPath = null;
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      logPath = p;
      break;
    }
  }
  if (!logPath) {
    res.setHeader('Content-Type', 'application/json');
    res.json([]);
    return;
  }
  fs.readFile(logPath, 'utf8', (err, data) => {
    if (err) {
      res.json({ error: '日志文件读取失败', detail: err.message });
      return;
    }
    const lines = data.trim().split('\n');
    // 解析为结构化对象
    const logObjects = lines.slice(-200).map(line => {
      const match = line.match(/^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3}) (\w+) (.*)$/);
      if (match) {
        return {
          timestamp: match[1],
          type: match[2] === 'error' ? 'error' : 'info',
          message: match[3]
        };
      } else {
        return {
          timestamp: '',
          type: 'info',
          message: line
        };
      }
    });
    res.setHeader('Content-Type', 'application/json');
    res.json(logObjects);
  });
});
app.post('/refresh_cache', (req, res) => {
  wsService.clearAllCache();
  res.json({ success: true, message: '缓存已清理' });
});

logInfo('启动WebSocket服务...');
logInfo('环境配置检查:');
logInfo('- SUPABASE_URL:', process.env.VITE_SUPABASE_URL ? '已设置' : '未设置');
logInfo('- SUPABASE_ANON_KEY:', process.env.VITE_SUPABASE_ANON_KEY ? '已设置' : '未设置');
logInfo('- SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '已设置' : '未设置');

if (!process.env.VITE_SUPABASE_URL || !process.env.VITE_SUPABASE_ANON_KEY || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  logError('错误: 环境变量未正确设置，请检查.env文件');
  process.exit(1);
}

const WebSocketService = require('./websocketService');
const wsService = new WebSocketService();
wsService.initialize().catch(console.error);

// 启动HTTP服务器
server.listen(PORT, () => {
  const interfaces = os.networkInterfaces();
  let ipAddress = 'localhost'; // 默认值为localhost

  // 遍历网络接口，获取第一个有效的IPv4地址
  for (const interfaceName in interfaces) {
    for (const iface of interfaces[interfaceName]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        ipAddress = iface.address;
        break;
      }
    }
  }

  logInfo(`HTTP服务器已启动，监听端口 ${PORT}`);
  logInfo(`- 访问 http://${ipAddress}:${PORT} 查看服务状态`);
  logInfo(`- 访问 http://${ipAddress}:${PORT}/wss_log 查看服务日志`);
});

// 优雅退出
process.on('SIGTERM', () => {
  logInfo('收到SIGTERM信号，正在关闭连接...');
  for (const botId of wsService.connections.keys()) {
    wsService.disconnect(botId);
  }
  server.close(() => {
    logInfo('HTTP服务器已关闭');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logInfo('收到SIGINT信号，正在关闭连接...');
  for (const botId of wsService.connections.keys()) {
    wsService.disconnect(botId);
  }
  server.close(() => {
    logInfo('HTTP服务器已关闭');
    process.exit(0);
  });
});

// 在文件末尾添加未捕获异常处理
process.on('uncaughtException', (error) => {
  logError('未捕获的异常:', error);
  if (error.stack) {
    logError('错误堆栈:', error.stack);
  }
});

process.on('unhandledRejection', (reason, promise) => {
  logError('未处理的Promise拒绝:', reason);
  if (reason.stack) {
    logError('错误堆栈:', reason.stack);
  }
}); 