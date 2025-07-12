module.exports = async (req, res) => {
  // 设置 CORS 头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { key } = req.query;
    
    if (!key) {
      return res.status(400).json({
        Code: 400,
        Text: '缺少授权密钥',
        Data: null
      });
    }

    // 模拟登录状态检查
    // 在实际环境中，这里应该检查真实的登录状态
    const mockLoginData = {
      state: 0, // 0: 未扫码, 1: 已扫码待确认, 2: 登录成功
      wxid: '',
      nick_name: '',
      head_img_url: ''
    };

    res.status(200).json({
      Code: 200,
      Text: '检查登录状态成功',
      Data: mockLoginData
    });
  } catch (error) {
    console.error('检查登录状态失败:', error);
    res.status(500).json({
      Code: 500,
      Text: '检查登录状态失败',
      Data: null
    });
  }
};