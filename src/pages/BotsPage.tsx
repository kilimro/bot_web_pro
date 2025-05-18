import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, RefreshCw, AlertTriangle, Import, Check, Bot as BotIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import BotCard from '../components/Bot/BotCard';
import QrCodeLogin from '../components/Bot/QrCodeLogin';
import ImportBotForm from '../components/Bot/ImportBotForm';
import { Bot, LoginStatusResponse } from '../types';
import { getBotList, generateAuthKey, createBot, deleteBot, logoutBot, checkLoginStatus, getLoginStatus } from '../services/api';
import { supabase } from '../lib/supabase';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// 代理地区配置，可手动编辑
const REGION_PROXIES = [
  { label: '北京(默认)', value: 'beijing', proxy: '' }, // 默认
  { label: '河南', value: 'henan', proxy: 'socks5://GP0X6IG93S:91563817@106.42.31.35:13519' },
  // 可继续添加更多地区
];

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
  const [polling, setPolling] = useState(false);
  const [pollingTimeout, setPollingTimeout] = useState<NodeJS.Timeout | null>(null);
  const [pollingCount, setPollingCount] = useState(0);

  useEffect(() => {
    if (authKey) {
      setInnerAuthKey(authKey);
      initQrCode(authKey);
    } else {
      initLogin();
    }
  }, []);

  useEffect(() => {
    if (isScanning) {
      setPolling(true);
      setPollingCount(0);
      const timer = setInterval(async () => {
        setPollingCount(count => count + 1);
        try {
          const checkScanRes = await fetch(`${API_BASE_URL}/login/CheckLoginStatus?key=` + innerAuthKey);
          const checkScanData = await checkScanRes.json();
          console.log('[自动轮询] 扫码API返回:', checkScanData);
          if (checkScanData.Code === 200 && Number(checkScanData.Data.state) === 2) {
            clearInterval(timer);
            setPolling(false);
            await handleConfirmScan(true);
          } else if (pollingCount >= 30) {
            clearInterval(timer);
            setPolling(false);
            setError('扫码超时，请刷新二维码重试');
          }
        } catch (e) {
          // 忽略单次异常
        }
      }, 2000);
      setPollingTimeout(timer);
      return () => clearInterval(timer);
    }
  }, [isScanning, innerAuthKey]);

  const initQrCode = async (key: string) => {
    try {
      setIsLoading(true);
      setError(null);
      setStatus('正在获取登录二维码...');
      const qrResponse = await fetch(`${API_BASE_URL}/login/GetLoginQrCodeNewX?key=` + key, {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          Check: false,
          Proxy: regionProxy || '' // 这里根据地区传递代理
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
    } catch (error) {
      setError(error instanceof Error ? error.message : '初始化登录失败');
      setIsLoading(false);
    }
  };

  const initLogin = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const keyResponse = await generateAuthKey();
      if (keyResponse.Code !== 200) {
        throw new Error(keyResponse.Text || '生成授权码失败');
      }
      const newAuthKey = keyResponse.Data[0];
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
      
      const checkScanRes = await fetch(`${API_BASE_URL}/login/CheckLoginStatus?key=` + innerAuthKey);
      const checkScanData = await checkScanRes.json();
      console.log('扫码API返回:', checkScanData);
      
      if (checkScanData.Code !== 200 || Number(checkScanData.Data.state) !== 2) {
        if (!fromPolling) {
          console.warn('扫码状态不通过，Code:', checkScanData.Code, 'state:', checkScanData.Data.state);
          throw new Error('请先完成扫码登录');
        } else {
          setIsLoading(false);
          return;
        }
      }

      const loginStatusRes = await fetch(`${API_BASE_URL}/login/GetLoginStatus?key=` + innerAuthKey);
      const loginStatusData = await loginStatusRes.json();
      console.log('在线状态API返回:', loginStatusData);
      if (
        loginStatusData.Code !== 200 ||
        !loginStatusData.Data ||
        loginStatusData.Data.loginState !== 1
      ) {
        console.warn('机器人未在线，Code:', loginStatusData.Code, 'loginState:', loginStatusData.Data?.loginState);
        throw new Error('机器人未在线');
      }

      const profileResponse = await fetch(`${API_BASE_URL}/user/GetProfile?key=` + innerAuthKey);
      const profileData = await profileResponse.json();
      console.log('机器人资料API返回:', profileData);
      if (profileData.Code !== 200) {
        throw new Error('获取机器人资料失败');
      }

      const { data: { session } } = await supabase.auth.getSession();
      const { data: bot, error: createError } = await supabase
        .from('bots')
        .insert([{
          auth_key: innerAuthKey,
          wxid: checkScanData.Data.wxid,
          nickname: profileData.Data.userInfo.nickName.str,
          avatar_url: profileData.Data.userInfoExt.bigHeadImgUrl,
          status: 'online',
          created_at: new Date().toISOString(),
          user_id: session?.user?.id || null
        }])
        .select()
        .single();

      if (createError) {
        throw new Error('保存机器人信息失败: ' + createError.message);
      }

      if (pollingTimeout) clearInterval(pollingTimeout);
      setPolling(false);
      onSuccess();
      onClose();
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
            <div className="relative flex items-center justify-center h-16 w-16 mb-4">
              <div className="absolute inset-0 rounded-full border-4 border-t-transparent border-b-transparent border-l-blue-400 border-r-purple-400 animate-spin-slow"></div>
              <div className="z-10 bg-gradient-to-br from-blue-400 to-purple-400 rounded-full p-3 shadow-lg animate-pulse">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M7.5 2.5v3M16.5 2.5v3M12 7v3M12 17v3M2.5 7.5h3M18.5 7.5h3M2.5 16.5h3M18.5 16.5h3M7 12h3M14 12h3" stroke="#fff" strokeWidth="2" strokeLinecap="round"/></svg>
              </div>
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex space-x-1">
                <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:0s]"></span>
                <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
              </div>
            </div>
            <p className="mt-2 text-base text-blue-500 font-semibold tracking-wide animate-pulse">请用微信扫码并在手机上确认登录，正在检测扫码状态...</p>
          </div>
        ) : (
          <div className="text-center py-8">
            <img src={qrCodeUrl} alt="登录二维码" className="mx-auto mb-4" />
            <p className="text-gray-600 mb-4">{status}</p>
            {isScanning && (
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

const BotsPage: React.FC = () => {
  const [showImportForm, setShowImportForm] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreatingBot, setIsCreatingBot] = useState(false);
  const [bots, setBots] = useState<Bot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loginBotKey, setLoginBotKey] = useState<string | null>(null);
  const [region, setRegion] = useState(REGION_PROXIES[0].value); // 默认北京
  const [showRegionSelect, setShowRegionSelect] = useState(false);

  useEffect(() => {
    fetchBots();
  }, []);

  const fetchBots = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const botsList = await getBotList();
      setBots(botsList);
    } catch (err) {
      setError('Failed to load bots. Please try again later.');
      console.error('Error fetching bots:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (botId: string) => {
    const bot = bots.find(b => b.id === botId);
    if (bot && bot.auth_key) {
      setLoginBotKey(bot.auth_key);
      setShowCreateModal(true);
    }
  };

  const handleDelete = async (botId: string) => {
    try {
      await deleteBot(botId);
      await fetchBots();
    } catch (error) {
      console.error('删除机器人失败:', error);
      setError('删除机器人失败');
    }
  };

  const handleLogout = async (botId: string) => {
    try {
      const bot = bots.find(b => b.id === botId);
      if (!bot) throw new Error('未找到机器人');
      if (!bot.auth_key) throw new Error('机器人缺少授权密钥');
      const res = await logoutBot(bot.auth_key);
      if (res.Code !== 200) throw new Error(res.Text || '下线失败');
      await supabase
        .from('bots')
        .update({
          status: 'offline',
          last_active_at: new Date().toISOString()
        })
        .eq('id', botId);
      await fetchBots();
    } catch (error) {
      setError(error instanceof Error ? error.message : '下线失败');
    }
  };

  const handleRefresh = async (botId: string) => {
    try {
      const bot = bots.find(b => b.id === botId);
      if (!bot || !bot.auth_key) throw new Error('未找到机器人或缺少授权密钥');
      const statusRes = await getLoginStatus(bot.auth_key);
      let newStatus = 'offline';
      const data = statusRes.Data;
      const isOnline = statusRes.Code === 200 && data && data.loginState === 1;
      if (isOnline) {
        newStatus = 'online';
      }
      await supabase
        .from('bots')
        .update({
          status: newStatus,
          last_active_at: new Date().toISOString()
        })
        .eq('id', botId);
      await fetchBots();
    } catch (error) {
      setError(error instanceof Error ? error.message : '刷新状态失败');
    }
  };

  return (
    <div>
      <div className="mb-8 flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-2 rounded bg-gradient-to-b from-blue-500 to-purple-400 mr-2" />
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 text-blue-500 rounded-full p-3 shadow-sm">
              <BotIcon size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800 tracking-tight">机器人管理</h1>
              <p className="text-gray-500 mt-1">管理您的所有bot机器人</p>
            </div>
          </div>
        </div>
        <div className="flex space-x-4">
          <button
            onClick={() => setShowImportForm(true)}
            className="px-5 py-2 bg-gradient-to-r from-green-500 to-blue-400 text-white rounded-xl font-bold shadow hover:scale-105 hover:shadow-xl transition-all text-base flex items-center gap-2"
          >
            导入机器人
          </button>
          <button
            onClick={() => setShowRegionSelect(true)}
            disabled={isCreatingBot}
            className={`px-5 py-2 bg-gradient-to-r from-blue-600 to-purple-500 text-white rounded-xl font-bold shadow hover:scale-105 hover:shadow-xl transition-all text-base flex items-center gap-2 ${isCreatingBot ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {isCreatingBot ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                创建中...
              </>
            ) : (
              <>新建机器人</>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
          <div className="flex items-center">
            <AlertTriangle className="text-red-500 mr-2" size={20} />
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex flex-col items-center justify-center h-64">
          <div className="relative flex items-center justify-center h-16 w-16 mb-4">
            <div className="absolute inset-0 rounded-full border-4 border-t-transparent border-b-transparent border-l-blue-400 border-r-purple-400 animate-spin-slow"></div>
            <div className="z-10 bg-gradient-to-br from-blue-400 to-purple-400 rounded-full p-3 shadow-lg animate-pulse">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M7.5 2.5v3M16.5 2.5v3M12 7v3M12 17v3M2.5 7.5h3M18.5 7.5h3M2.5 16.5h3M18.5 16.5h3M7 12h3M14 12h3" stroke="#fff" strokeWidth="2" strokeLinecap="round"/></svg>
            </div>
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex space-x-1">
              <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:0s]"></span>
              <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
              <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
            </div>
          </div>
          <p className="mt-2 text-base text-blue-500 font-semibold tracking-wide animate-pulse">机器人列表加载中…</p>
        </div>
      ) : bots.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-600 mb-4">还没有机器人，立即创建或导入一个吧！</p>
          <div className="flex justify-center space-x-4">
            <button
              onClick={() => setShowRegionSelect(true)}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <Plus size={18} className="mr-2" />
              新建机器人
            </button>
            <button
              onClick={() => setShowImportForm(true)}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            >
              <Import size={18} className="mr-2" />
              导入机器人
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {bots.map((bot) => (
            <BotCard 
              key={bot.id} 
              bot={bot} 
              onDelete={handleDelete}
              onLogin={handleLogin}
              onLogout={handleLogout}
              onRefresh={handleRefresh}
            />
          ))}
        </div>
      )}

      {showImportForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">导入现有机器人</h3>
              <button
                onClick={() => setShowImportForm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                &times;
              </button>
            </div>
            <ImportBotForm onSuccess={() => {
              setShowImportForm(false);
              fetchBots();
            }} />
          </div>
        </div>
      )}

      {showRegionSelect && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-xs w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">选择地区</h3>
              <button onClick={() => setShowRegionSelect(false)} className="text-gray-400 hover:text-gray-600">&times;</button>
            </div>
            <div className="mb-4">
              <select
                className="w-full border rounded px-3 py-2"
                value={region}
                onChange={e => setRegion(e.target.value)}
              >
                {REGION_PROXIES.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
            <button
              className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
              onClick={() => {
                setShowRegionSelect(false);
                setShowCreateModal(true);
              }}
            >
              确定
            </button>
          </div>
        </div>
      )}

      {showCreateModal && (
        <QrCodeLoginModal
          onClose={() => {
            setShowCreateModal(false);
            setLoginBotKey(null);
          }}
          onSuccess={fetchBots}
          authKey={loginBotKey || undefined}
          regionProxy={REGION_PROXIES.find(r => r.value === region)?.proxy || ''}
        />
      )}
    </div>
  );
};

export default BotsPage;