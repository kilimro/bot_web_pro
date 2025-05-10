import axios, { AxiosError } from 'axios';
import { supabase } from '../lib/supabase';
import { AuthKeyResponse, QrCodeResponse, LoginStatusResponse, Bot, BotProfile, UserProfileResponse, KeywordReply } from '../types';

const API_BASE_URL = 'https://kimi.920pdd.com';
const API_KEY = 'HG@520';//设置的管理员密码

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  timeout: 15000,
});

api.interceptors.response.use(
  response => response,
  (error: AxiosError) => {
    let errorMessage = '请求失败';
    
    if (error.response) {
      const status = error.response.status;
      switch (status) {
        case 401:
          errorMessage = '认证失败，请重新登录';
          break;
        case 403:
          errorMessage = '无权访问该资源';
          break;
        case 404:
          errorMessage = '请求的资源不存在';
          break;
        case 500:
          errorMessage = '服务器内部错误';
          break;
        default:
          errorMessage = `请求失败 (${status})`;
      }
    } else if (error.request) {
      if (error.code === 'ECONNABORTED') {
        errorMessage = '请求超时，请检查网络连接';
      } else {
        errorMessage = '无法连接到服务器，请检查网络';
      }
    }

    return Promise.reject(new Error(errorMessage));
  }
);

export const generateAuthKey = async (count: number = 1, days: number = 30): Promise<AuthKeyResponse> => {
  try {
    const response = await api.post(`/admin/GenAuthKey1?key=${API_KEY}`, {
      Count: count,
      Days: days,
    });
    return response.data;
  } catch (error) {
    console.error('生成授权密钥失败:', error);
    throw error;
  }
};

export const getLoginQrCode = async (authKey: string): Promise<QrCodeResponse> => {
  try {
    const response = await api.post(`/login/GetLoginQrCodeNewX?key=${authKey}`, {
      Check: false,
      Proxy: ''
    });
    return response.data;
  } catch (error) {
    console.error('获取登录二维码失败:', error);
    throw error;
  }
};

export const checkLoginStatus = async (authKey: string): Promise<LoginStatusResponse> => {
  try {
    const response = await api.get(`/login/CheckLoginStatus?key=${authKey}`);
    return response.data;
  } catch (error) {
    console.error('检查登录状态失败:', error);
    throw new Error('获取登录状态失败');
  }
};

export const importBot = async (authKey: string): Promise<Bot> => {
  try {
    if (!authKey?.trim()) {
      throw new Error('授权密钥不能为空');
    }

    // Check if bot exists
    const { data: existingBots, error: queryError } = await supabase
      .from('bots')
      .select('id')
      .eq('auth_key', authKey);

    if (queryError) {
      throw new Error('检查机器人是否存在时发生错误');
    }

    if (existingBots && existingBots.length > 0) {
      throw new Error('该授权密钥已被使用');
    }

    // First check login status
    const loginStatusResponse = await api.get(`/login/GetLoginStatus?key=${authKey}`);
    
    if (loginStatusResponse.data.Code !== 200) {
      throw new Error(loginStatusResponse.data.Text || '获取登录状态失败');
    }

    const loginStatus = loginStatusResponse.data.Data;
    if (!loginStatus) {
      throw new Error('获取登录状态失败');
    }

    if (loginStatus.loginState !== 1) {
      throw new Error('机器人不在线，请确保已在其他设备登录');
    }

    // Then get user profile
    const profileResponse = await api.get(`/user/GetProfile?key=${authKey}`);
    
    if (profileResponse.data.Code !== 200) {
      throw new Error(profileResponse.data.Text || '获取用户资料失败');
    }

    const profileData = profileResponse.data.Data;
    if (!profileData?.userInfo || !profileData?.userInfoExt) {
      throw new Error('获取用户资料失败');
    }

    // Get user session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) {
      throw new Error('未登录或会话已过期');
    }

    // Create bot record with profile data
    const { data: bot, error: botError } = await supabase
      .from('bots')
      .insert({
        auth_key: authKey,
        status: 'online',
        wxid: profileData.userInfo.userName.str,
        nickname: profileData.userInfo.nickName.str,
        avatar_url: profileData.userInfoExt.bigHeadImgUrl,
        user_id: session.user.id,
        last_active_at: new Date().toISOString()
      })
      .select()
      .single();

    if (botError) {
      throw new Error('创建机器人记录失败');
    }

    // Create bot profile
    await supabase
      .from('bot_profiles')
      .insert({
        bot_id: bot.id,
        username: profileData.userInfo.userName.str,
        nickname: profileData.userInfo.nickName.str,
        bind_uin: profileData.userInfo.bindUin,
        bind_email: profileData.userInfo.bindEmail.str,
        bind_mobile: profileData.userInfo.bindMobile.str,
        sex: profileData.userInfo.sex,
        level: profileData.userInfo.level,
        experience: profileData.userInfo.experience,
        alias: profileData.userInfo.alias,
        big_head_img_url: profileData.userInfoExt.bigHeadImgUrl,
        small_head_img_url: profileData.userInfoExt.smallHeadImgUrl
      });

    return bot;
  } catch (error) {
    console.error('导入机器人失败:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('导入机器人失败');
  }
};

export const getBotList = async (): Promise<Bot[]> => {
  try {
    const { data: bots, error } = await supabase
      .from('bots')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return bots || [];
  } catch (error) {
    console.error('获取机器人列表失败:', error);
    throw error;
  }
};

export const getBotDetail = async (botId: string): Promise<Bot> => {
  try {
    const { data: bot, error } = await supabase
      .from('bots')
      .select('*')
      .eq('id', botId)
      .single();

    if (error) throw error;
    return bot;
  } catch (error) {
    console.error('获取机器人详情失败:', error);
    throw error;
  }
};

export const getBotProfile = async (botId: string): Promise<BotProfile | null> => {
  try {
    const { data: profile, error } = await supabase
      .from('bot_profiles')
      .select('*')
      .eq('bot_id', botId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return profile;
  } catch (error) {
    console.error('获取机器人资料失败:', error);
    throw error;
  }
};

export const getUserProfile = async (authKey: string): Promise<UserProfileResponse> => {
  try {
    const response = await api.get(`/user/GetProfile?key=${authKey}`);
    return response.data;
  } catch (error) {
    console.error('获取用户资料失败:', error);
    throw error;
  }
};

export const updateBotProfile = async (profileData: Partial<BotProfile>): Promise<BotProfile> => {
  try {
    const { data: existingProfile } = await supabase
      .from('bot_profiles')
      .select('id')
      .eq('bot_id', profileData.bot_id)
      .single();

    let result;
    
    if (existingProfile) {
      const { data, error } = await supabase
        .from('bot_profiles')
        .update(profileData)
        .eq('bot_id', profileData.bot_id)
        .select()
        .single();
      
      if (error) throw error;
      result = data;
    } else {
      const { data, error } = await supabase
        .from('bot_profiles')
        .insert([profileData])
        .select()
        .single();
      
      if (error) throw error;
      result = data;
    }

    return result;
  } catch (error) {
    console.error('更新机器人资料失败:', error);
    throw error;
  }
};

export const createBot = async (botData: Partial<Bot>): Promise<Bot> => {
  try {
    const { data, error } = await supabase
      .from('bots')
      .insert([botData])
      .select()
      .single();

    if (error) throw error;

    if (data.status === 'online') {
      // wsService.connect(data.auth_key, data.id);
    }

    return data;
  } catch (error) {
    console.error('创建机器人失败:', error);
    throw error;
  }
};

export const updateBot = async (botId: string, updates: Partial<Bot>): Promise<Bot> => {
  try {
    const { data, error } = await supabase
      .from('bots')
      .update(updates)
      .eq('id', botId)
      .select()
      .single();

    if (error) throw error;

    if (data.status === 'online') {
      // wsService.connect(data.auth_key, data.id);
    } else {
      // wsService.disconnect(data.id);
    }

    return data;
  } catch (error) {
    console.error('更新机器人失败:', error);
    throw error;
  }
};

export const deleteBot = async (botId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('bots')
      .delete()
      .eq('id', botId);

    if (error) throw error;
  } catch (error) {
    console.error('删除机器人失败:', error);
    throw error;
  }
};

export const updateStepNumber = async (authKey: string, number: number): Promise<any> => {
  try {
    const response = await api.post(`/other/UpdateStepNumber?key=${authKey}`, {
      Number: number
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.code === 'ECONNABORTED') {
      throw new Error('请求超时，请稍后重试');
    }
    console.error('修改步数失败:', error);
    throw error;
  }
};

export const setSendPat = async (authKey: string, value: string): Promise<any> => {
  try {
    const response = await api.post(`/user/SetSendPat?key=${authKey}`, {
      Value: value
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.code === 'ECONNABORTED') {
      throw new Error('请求超时，请稍后重试');
    }
    console.error('设置拍一拍失败:', error);
    throw error;
  }
};

export const sendTextMessage = async (authKey: string, wxid: string, content: string): Promise<any> => {
  try {
    const response = await api.post(`/message/SendTextMessage?key=${authKey}`, {
      MsgItem: [{
        AtWxIDList: [],
        ImageContent: "",
        MsgType: 0,
        TextContent: content,
        ToUserName: wxid
      }]
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.code === 'ECONNABORTED') {
      throw new Error('请求超时，请稍后重试');
    }
    console.error('发送文本消息失败:', error);
    throw error;
  }
};

export const sendImageMessage = async (authKey: string, wxid: string, imageUrl: string): Promise<any> => {
  try {
    const response = await api.post(`/message/SendImageNewMessage?key=${authKey}`, {
      MsgItem: [{
        AtWxIDList: [],
        ImageContent: imageUrl,
        MsgType: 0,
        TextContent: "",
        ToUserName: wxid
      }]
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.code === 'ECONNABORTED') {
      throw new Error('请求超时，请稍后重试');
    }
    console.error('发送图片消息失败:', error);
    throw error;
  }
};

export const sendVoiceMessage = async (authKey: string, wxid: string, voiceUrl: string): Promise<any> => {
  try {
    const response = await api.post(`/message/SendVoice?key=${authKey}`, {
      ToUserName: wxid,
      VoiceData: voiceUrl,
      VoiceFormat: 0,
      VoiceSecond: 0
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.code === 'ECONNABORTED') {
      throw new Error('请求超时，请稍后重试');
    }
    console.error('发送语音消息失败:', error);
    throw error;
  }
};

export const getKeywordReplies = async (): Promise<KeywordReply[]> => {
  try {
    const { data, error } = await supabase
      .from('keyword_replies')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('获取关键词回复列表失败:', error);
    throw error;
  }
};

export const createKeywordReply = async (replyData: Omit<KeywordReply, 'id' | 'user_id' | 'created_at'>): Promise<KeywordReply> => {
  try {
    const { data, error } = await supabase
      .from('keyword_replies')
      .insert([replyData])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('创建关键词回复失败:', error);
    throw error;
  }
};

export const updateKeywordReply = async (id: string, updates: Partial<KeywordReply>): Promise<KeywordReply> => {
  try {
    const { data, error } = await supabase
      .from('keyword_replies')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('更新关键词回复失败:', error);
    throw error;
  }
};

export const deleteKeywordReply = async (id: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('keyword_replies')
      .delete()
      .eq('id', id);

    if (error) throw error;
  } catch (error) {
    console.error('删除关键词回复失败:', error);
    throw error;
  }
};

interface AiModelConfig {
  id: string;
  user_id: string;
  name: string;
  model: string;
  base_url: string;
  api_key: string;
  system_prompt: string;
  image_model: string;
  image_base_url: string;
  image_api_key: string;
  created_at: string;
  updated_at: string;
}

export const getAIConfigs = async (): Promise<AIConfig[]> => {
  try {
    const { data, error } = await supabase
      .from('ai_configs')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('获取AI配置失败:', error);
    throw error;
  }
};

export const saveAIConfig = async (config: Partial<AIConfig>): Promise<AIConfig> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('用户未登录');
    }

    // 验证必要的字段
    if (!config.base_url || !config.model || !config.api_key) {
      throw new Error('请填写完整的AI配置信息');
    }

    // 清理配置数据，移除undefined值
    const cleanConfig = Object.entries(config).reduce((acc, [key, value]) => {
      if (value !== undefined) {
        acc[key] = value;
      }
      return acc;
    }, {} as Record<string, any>);

    const configData = {
      ...cleanConfig,
      user_id: user.id,
      updated_at: new Date().toISOString(),
      created_at: config.id ? undefined : new Date().toISOString()
    };

    console.log('准备保存的配置数据:', configData);

    if (config.id) {
      const { data, error } = await supabase
        .from('ai_configs')
        .update(configData)
        .eq('id', config.id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        console.error('更新AI配置失败:', error);
        throw error;
      }
      return data;
    } else {
      const { data, error } = await supabase
        .from('ai_configs')
        .insert([configData])
        .select()
        .single();

      if (error) {
        console.error('创建AI配置失败:', error);
        throw error;
      }
      return data;
    }
  } catch (error) {
    console.error('保存AI配置失败:', error);
    if (error instanceof Error) {
      throw new Error(`保存AI配置失败: ${error.message}`);
    }
    throw new Error('保存AI配置失败: 未知错误');
  }
};

export const deleteAIConfig = async (id: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('ai_configs')
      .delete()
      .eq('id', id);

    if (error) throw error;
  } catch (error) {
    console.error('删除AI配置失败:', error);
    throw error;
  }
};

export const generateText = async (config: AIConfig, prompt: string): Promise<string> => {
  try {
    const response = await fetch(`${config.base_url}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.api_key}`
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          {
            role: 'system',
            content: config.system_prompt || '你是一个专业的文案创作助手，擅长创作有趣、有吸引力的朋友圈文案。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      throw new Error('生成文本失败');
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('生成文本失败:', error);
    throw error;
  }
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const generateImage = async (config: AIConfig, prompt: string, retries = 3): Promise<string> => {
  try {
    if (!config.image_base_url || !config.image_model || !config.image_api_key) {
      throw new Error('请先配置图片生成服务');
    }

    console.log('开始生成图片，配置:', {
      base_url: config.image_base_url,
      model: config.image_model,
      prompt: prompt
    });

    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await fetch(`${config.image_base_url}/v1/images/generations`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.image_api_key}`
          },
          body: JSON.stringify({
            model: config.image_model,
            prompt: prompt,
            n: 1,
            size: '1024x1024',
            quality: 'standard'
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`尝试 ${attempt}/${retries} 失败:`, {
            status: response.status,
            statusText: response.statusText,
            errorText
          });

          if (response.status === 400) {
            // Don't retry on validation errors
            throw new Error(errorText);
          }

          lastError = new Error(`HTTP error! status: ${response.status}`);
          
          if (attempt < retries) {
            // Wait before retrying, with exponential backoff
            await sleep(Math.pow(2, attempt) * 1000);
            continue;
          }
          throw lastError;
        }

        const data = await response.json();
        console.log('生成图片成功，响应数据:', data);

        if (!data.data?.[0]?.url) {
          throw new Error('生成图片失败: 未获取到图片URL');
        }

        // Get the generated image
        console.log('开始获取图片:', data.data[0].url);
        const imageResponse = await fetch(data.data[0].url);

        if (!imageResponse.ok) {
          throw new Error(`获取图片失败: ${imageResponse.status}`);
        }

        const blob = await imageResponse.blob();
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            if (typeof reader.result === 'string') {
              resolve(reader.result);
            } else {
              reject(new Error('Failed to convert image to base64'));
            }
          };
          reader.onerror = () => reject(new Error('Failed to read image'));
          reader.readAsDataURL(blob);
        });

      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        if (attempt === retries) throw lastError;
        await sleep(Math.pow(2, attempt) * 1000);
      }
    }

    throw lastError || new Error('Failed to generate image after retries');
  } catch (error) {
    console.error('生成图片失败:', error);
    if (error instanceof Error) {
      throw new Error(`生成图片失败: ${error.message}`);
    }
    throw new Error('生成图片失败: 未知错误');
  }
};