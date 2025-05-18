import React, { useState, useEffect } from 'react';
import { AlertTriangle, Check } from 'lucide-react';
import { LoginStatusResponse } from '../../types';
import { supabase } from '../../lib/supabase';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

interface QrCodeLoginModalProps {
  onClose: () => void;
  onSuccess: () => void;
  authKey?: string;
  regionProxy?: string;
}

const QrCodeLogin: React.FC<QrCodeLoginModalProps> = ({ onClose, onSuccess, authKey, regionProxy }) => {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [innerAuthKey, setInnerAuthKey] = useState<string>(authKey || '');
  const [status, setStatus] = useState<string>('正在生成授权码...');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [showConfirmButton, setShowConfirmButton] = useState(false);
  const [polling, setPolling] = useState(false);
  const [pollingTimeout, setPollingTimeout] = useState<NodeJS.Timeout | null>(null);
  const [pollingCount, setPollingCount] = useState(0);
  const [scanCheckTimer, setScanCheckTimer] = useState<NodeJS.Timeout | null>(null);
  const [loginSuccess, setLoginSuccess] = useState(false);

  useEffect(() => {
    if (authKey) {
      setInnerAuthKey(authKey);
      initQrCode(authKey);
    } else {
      initLogin();
    }

    return () => {
      if (pollingTimeout) clearInterval(pollingTimeout);
      if (scanCheckTimer) clearTimeout(scanCheckTimer);
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

      // 开始自动轮询
      startPolling(key);

      // 设置6秒后显示确认按钮的定时器
      const timer = setTimeout(() => {
        // 只有在未登录成功的情况下才显示确认按钮
        if (!loginSuccess) {
          setShowConfirmButton(true);
        }
      }, 6000);
      setScanCheckTimer(timer);
    } catch (error) {
      setError(error instanceof Error ? error.message : '初始化登录失败');
      setIsLoading(false);
    }
  };

  const startPolling = (key: string) => {
    setPolling(true);
    setPollingCount(0);
    const timer = setInterval(async () => {
      setPollingCount(count => count + 1);
      try {
        const checkScanRes = await fetch(`${API_BASE_URL}/login/CheckLoginStatus?key=${key}`);
        const checkScanData = await checkScanRes.json();
        
        if (checkScanData.Code === 200) {
          if (Number(checkScanData.Data.state) === 2) {
            // 扫码成功
            clearInterval(timer);
            setPolling(false);
            setShowConfirmButton(false);
            setLoginSuccess(true);
            await handleConfirmScan(true);
          } else if (Number(checkScanData.Data.state) === 1) {
            // 已扫码但未确认
            setStatus('已扫码，等待确认...');
          }
        }
        
        if (pollingCount >= 30) {
          clearInterval(timer);
          setPolling(false);
          setError('扫码超时，请刷新二维码重试');
        }
      } catch (e) {
        console.error('轮询出错:', e);
      }
    }, 2000);
    setPollingTimeout(timer);
  };

  const initLogin = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const keyResponse = await fetch(`${API_BASE_URL}/admin/GenAuthKey1?key=${import.meta.env.VITE_API_ADMIN_KEY}`, {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          Count: 1,
          Days: 30
        })
      });
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

  const handleConfirmScan = async (fromPolling = false) => {
    try {
      if (!fromPolling) {
        console.log('点击了已扫码确认，authKey:', innerAuthKey);
      }
      setIsLoading(true);
      setError(null);
      
      const checkScanRes = await fetch(`${API_BASE_URL}/login/CheckLoginStatus?key=${innerAuthKey}`);
      const checkScanData = await checkScanRes.json();
      
      if (checkScanData.Code !== 200 || Number(checkScanData.Data.state) !== 2) {
        if (!fromPolling) {
          throw new Error('请先完成扫码登录');
        } else {
          setIsLoading(false);
          return;
        }
      }

      const loginStatusRes = await fetch(`${API_BASE_URL}/login/GetLoginStatus?key=${innerAuthKey}`);
      const loginStatusData = await loginStatusRes.json();
      
      if (loginStatusData.Code !== 200 || !loginStatusData.Data || loginStatusData.Data.loginState !== 1) {
        throw new Error('机器人未在线');
      }

      const profileResponse = await fetch(`${API_BASE_URL}/user/GetProfile?key=${innerAuthKey}`);
      const profileData = await profileResponse.json();
      
      if (profileData.Code !== 200) {
        throw new Error('获取机器人资料失败');
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        throw new Error('未登录或会话已过期');
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
          user_id: session.user.id
        }])
        .select()
        .single();

      if (createError) {
        throw new Error('保存机器人信息失败: ' + createError.message);
      }

      if (pollingTimeout) clearInterval(pollingTimeout);
      if (scanCheckTimer) clearTimeout(scanCheckTimer);
      setPolling(false);
      setLoginSuccess(true);
      setStatus('登录成功！');
      
      // 延迟关闭以显示成功状态
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } catch (error) {
      setError(error instanceof Error ? error.message : '确认登录失败');
      setIsLoading(false);
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
            <p className="text-red-600 mb-4">{error}</p>
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
          <div className="text-center py-8">
            <img src={qrCodeUrl} alt="登录二维码" className="mx-auto mb-4" />
            <p className={`text-lg mb-4 ${loginSuccess ? 'text-green-600 font-bold' : 'text-gray-600'}`}>
              {status}
            </p>
            {isScanning && showConfirmButton && !loginSuccess && (
              <button
                onClick={() => handleConfirmScan(false)}
                className="flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 mx-auto"
              >
                <Check className="mr-2" size={18} />
                已扫码确认
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default QrCodeLogin;
