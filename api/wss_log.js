const fs = require('fs');
const path = require('path');

module.exports = async (req, res) => {
  // 设置 CORS 头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // 在 Vercel 环境中，我们使用内存存储或数据库来存储日志
    // 这里返回模拟的日志数据
    const mockLogs = [
      {
        timestamp: new Date().toISOString(),
        type: 'info',
        message: 'Vercel 环境运行中...'
      },
      {
        timestamp: new Date(Date.now() - 60000).toISOString(),
        type: 'info',
        message: '系统启动完成'
      }
    ];

    res.setHeader('Content-Type', 'application/json');
    res.status(200).json(mockLogs);
  } catch (error) {
    console.error('获取日志失败:', error);
    res.status(500).json({ error: '获取日志失败' });
  }
};