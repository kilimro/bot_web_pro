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

    // 生成模拟二维码URL
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=mock_login_${key}_${Date.now()}`;

    res.status(200).json({
      Code: 200,
      Text: '获取二维码成功',
      Data: {
        QrCodeUrl: qrCodeUrl,
        Txt: '请使用微信扫描二维码',
        baseResp: {
          ret: 0,
          errMsg: {}
        }
      }
    });
  } catch (error) {
    console.error('获取二维码失败:', error);
    res.status(500).json({
      Code: 500,
      Text: '获取二维码失败',
      Data: null
    });
  }
};