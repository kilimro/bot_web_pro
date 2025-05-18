import React, { useState, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

interface QrCodeLoginModalProps {
  onClose: () => void;
  onSuccess: () => void;
  authKey?: string;
  regionProxy?: string;
}

const QrCodeLoginModal: React.FC<QrCodeLoginModalProps> = ({ onClose, onSuccess, authKey, regionProxy }) => {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [innerAuthKey, setInnerAuthKey] = useState<string>(authKey || '');
  const [status, setStatus] = useState<string>('正在生成授权码...');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [showConfirmButton, setShowConfirmButton] = useState(false);
  const [confirmingLogin, setConfirmingLogin] = useState(false);
  const [pollingTimeout, setPollingTimeout] = useState<NodeJS.Timeout | null>(null);
  const [pollingCount, setPollingCount] = useState(0);

  useEffect(() => {
    if (authKey) {
      setInnerAuthKey(authKey);
      initQrCode(authKey);
    } else {
      initLogin();
    }

    return () => {
      if (pollingTimeout) {
        clearTimeout(pollingTimeout);
      }
    };
  }, []);

  const initQrCode = async (key: string) => {
    try {
      setIsLoading(true);
      setError(null);
      setStatus('正在获取登录二维码...');
      
      const qrResponse = await fetch(`${API_BASE_URL}/login/GetLoginQrCodeNewX?key=${key}`, {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          Check: false,
          Proxy: regionProxy || ''
        })
      });
      
      const qrData = await qrResponse.json();
      
      if (qrData.Code !== 200) {
        throw new Error(qrData.Text || '获取二维码失败');
      }
      
      setQrCodeUrl(qrData.Data.QrCodeUrl);
      setStatus('请使用bot扫描二维码登录');
      setIsLoading(false);
      setIsScanning(true);
      startPolling(key);
    } catch (error) {
      setError(error instanceof Error ? error.message : '初始化登录失败');
      setIsLoading(false);
    }
  };

  const initLogin = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const keyResponse = await fetch(`${API_BASE_URL}/admin/GenAuthKey?key=${API_KEY}`);
      const keyData = await keyResponse.json();
      
      if (keyData.Code !== 200) {
        throw new Error(keyData.Text || '生成授权码失败');
      }
      
      const newAuthKey = keyData.Data[0];
      setInnerAuthKey(newAuthKey);
      await initQrCode(newAuthKey);
    } catch (error) {
      setError(error instanceof Error ? error.message : '初始化登录失败');
      setIsLoading(false);
    }
  };

  const startPolling = (key: string) => {
    let attempts = 0;
    const maxAttempts = 15; // 30秒 (2秒间隔 * 15次)
    const interval = 2000; // 2秒间隔

    const poll = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/login/CheckLoginStatus?key=${key}`);
        const data = await response.json();
        
        if (data.Code === 200) {
          const state = Number(data.Data.state);
          if (state === 2) {
            // 已确认登录
            await handleConfirmScan(true);
            return;
          } else if (state === 1) {
            // 已扫码未确认
            setStatus('已扫码，等待确认...');
            if (attempts >= 3) { // 6秒后显示确认按钮
              setShowConfirmButton(true);
            }
          }
        }

        attempts++;
        if (attempts < maxAttempts) {
          const timeout = setTimeout(poll, interval);
          setPollingTimeout(timeout);
        } else {
          setStatus('登录超时，请重试');
          setShowConfirmButton(false);
        }
      } catch (error) {
        console.error('轮询检查失败:', error);
        attempts++;
        if (attempts < maxAttempts) {
          const timeout = setTimeout(poll, interval);
          setPollingTimeout(timeout);
        }
      }
    };

    poll();
  };

  const handleConfirmScan = async (fromPolling = false) => {
    if (confirmingLogin) return;
    
    try {
      setConfirmingLogin(true);
      setError(null);
      setStatus('正在确认登录状态...');

      // 检查扫码状态
      const checkScanRes = await fetch(`${API_BASE_URL}/login/CheckLoginStatus?key=${innerAuthKey}`);
      const checkScanData = await checkScanRes.json();
      
      if (checkScanData.Code !== 200 || Number(checkScanData.Data.state) !== 2) {
        if (!fromPolling) {
          throw new Error('请先完成扫码登录');
        }
        setConfirmingLogin(false);
        return;
      }

      // 检查登录状态
      const loginStatusRes = await fetch(`${API_BASE_URL}/login/GetLoginStatus?key=${innerAuthKey}`);
      const loginStatusData = await loginStatusRes.json();
      
      if (loginStatusData.Code !== 200 || loginStatusData.Data.loginState !== 1) {
        throw new Error('机器人未在线');
      }

      // 获取用户资料
      const profileResponse = await fetch(`${API_BASE_URL}/user/GetProfile?key=${innerAuthKey}`);
      const profileData = await profileResponse.json();
      
      if (profileData.Code !== 200) {
        throw new Error('获取机器人资料失败');
      }

      // 保存到数据库
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        throw new Error('用户未登录');
      }

      const { data: bot, error: createError } = await supabase
        .from('bots')
        .insert([{
          auth_key: innerAuthKey,
          wxid: checkScanData.Data.wxid,
          nickname: profileData.Data.userInfo.nickName.str,
          avatar_url: profileData.Data.userInfoExt.bigHeadImgUrl,
          status: 'online',
          created_at: new Date().toISOString(),
          last_active_at: new Date().toISOString(),
          user_id: session.user.id
        }])
        .select()
        .single();

      if (createError) throw createError;

      setStatus('登录成功！');
      setTimeout(() => {
        onSuccess();
      }, 1500);
    } catch (error) {
      setError(error instanceof Error ? error.message : '确认登录失败');
      setConfirmingLogin(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">新建机器人</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            &times;
          </button>
        </div>

        {error ? (
          <div className="text-center py-8">
            <AlertTriangle className="mx-auto text-red-500 mb-4" size={48} />
            <div className="text-red-500 mb-4">{error}</div>
            <button
              onClick={initLogin}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              重试
            </button>
          </div>
        ) : isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700"></div>
            <p className="mt-4 text-gray-600">{status}</p>
          </div>
        ) : (
          <div className="text-center">
            <img 
              src={qrCodeUrl} 
              alt="bot登录二维码" 
              className="mx-auto mb-4 border p-2 rounded-lg shadow-sm"
              style={{ maxWidth: '200px' }}
            />
            <p className="text-gray-700 mb-4">{status}</p>
            
            {showConfirmButton && (
              <button
                onClick={() => handleConfirmScan(false)}
                disabled={confirmingLogin}
                className={`w-full py-2 px-4 bg-blue-600 text-white rounded-md transition-colors ${
                  confirmingLogin ? 'opacity-70 cursor-not-allowed' : 'hover:bg-blue-700'
                }`}
              >
                {confirmingLogin ? '确认中...' : '已完成扫码登录'}
              </button>
            )}
            
            <p className="mt-4 text-sm text-gray-500">
              扫码后，请在手机上点击确认登录
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default QrCodeLoginModal;