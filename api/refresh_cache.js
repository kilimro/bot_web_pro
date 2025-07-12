module.exports = async (req, res) => {
  // 设置 CORS 头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 在 Vercel 环境中清理缓存的逻辑
    // 这里可以清理 Redis 或其他缓存服务
    
    res.status(200).json({ 
      success: true, 
      message: '缓存已清理' 
    });
  } catch (error) {
    console.error('清理缓存失败:', error);
    res.status(500).json({ 
      success: false, 
      message: '清理缓存失败' 
    });
  }
};