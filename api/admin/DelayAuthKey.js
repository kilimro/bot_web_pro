const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

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
    const { Days, Key: authKey } = req.body;

    // 验证管理员密钥
    if (key !== process.env.VITE_API_ADMIN_KEY) {
      return res.status(403).json({
        Code: 403,
        Text: '无效的管理员密钥',
        Data: null
      });
    }

    // 计算新的过期时间
    const newExpiryDate = new Date();
    newExpiryDate.setDate(newExpiryDate.getDate() + Days);

    res.status(200).json({
      Code: 200,
      Text: '续期成功',
      Data: {
        expiryDate: newExpiryDate.toISOString()
      }
    });
  } catch (error) {
    console.error('续期授权密钥失败:', error);
    res.status(500).json({
      Code: 500,
      Text: '续期授权密钥失败',
      Data: null
    });
  }
};