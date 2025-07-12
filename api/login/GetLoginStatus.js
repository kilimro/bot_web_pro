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

    // 模拟在线状态
    const mockStatusData = {
      loginState: 0, // 0: 离线, 1: 在线
      loginTime: '',
      onlineTime: '',
      loginErrMsg: '机器人离线'
    };

    res.status(200).json({
      Code: 200,
      Text: '获取状态成功',
      Data: mockStatusData
    });
  } catch (error) {
    console.error('获取登录状态失败:', error);
    res.status(500).json({
      Code: 500,
      Text: '获取登录状态失败',
      Data: null
    });
  }
};