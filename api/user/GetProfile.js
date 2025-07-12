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

    // 模拟用户资料数据
    const mockProfileData = {
      baseResponse: {
        ret: 0,
        errMsg: {}
      },
      userInfo: {
        userName: { str: `user_${key.slice(0, 8)}` },
        nickName: { str: '演示用户' },
        bindUin: 0,
        bindEmail: { str: '' },
        bindMobile: { str: '' },
        sex: 1,
        level: 1,
        experience: 0,
        alias: ''
      },
      userInfoExt: {
        bigHeadImgUrl: 'https://via.placeholder.com/200x200?text=Avatar',
        smallHeadImgUrl: 'https://via.placeholder.com/100x100?text=Avatar'
      }
    };

    res.status(200).json({
      Code: 200,
      Text: '获取用户资料成功',
      Data: mockProfileData
    });
  } catch (error) {
    console.error('获取用户资料失败:', error);
    res.status(500).json({
      Code: 500,
      Text: '获取用户资料失败',
      Data: null
    });
  }
};