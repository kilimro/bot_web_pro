const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function generateRandomKey(length = 32) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

module.exports = async (req, res) => {
  // 设置 CORS 头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ 
      Code: 405, 
      Text: 'Method not allowed',
      Data: null 
    });
  }

  try {
    const { key } = req.query;
    const { Count = 1, Days = 30 } = req.body;

    // 验证管理员密钥
    if (key !== process.env.VITE_API_ADMIN_KEY) {
      return res.status(403).json({
        Code: 403,
        Text: '无效的管理员密钥',
        Data: null
      });
    }

    // 生成授权密钥
    const keys = [];
    for (let i = 0; i < Count; i++) {
      keys.push(generateRandomKey());
    }

    res.status(200).json({
      Code: 200,
      Text: '生成成功',
      Data: keys
    });
  } catch (error) {
    console.error('生成授权密钥失败:', error);
    res.status(500).json({
      Code: 500,
      Text: '生成授权密钥失败',
      Data: null
    });
  }
};