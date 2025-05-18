import React, { useState, useEffect } from 'react';
import { Bot, Activity, Wifi, WifiOff, RefreshCw, Clock, Monitor, Globe, Smartphone, Info, AlertTriangle, CheckCircle, XCircle, Copy, ChevronRight, Zap, Users, MessageSquare, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const API_SERVER_URL = import.meta.env.VITE_API_SERVER_URL;

// 打字机动画hook（更慢+停留+无闪烁+高亮只在打字时）
function useTypewriterLoop(text: string, highlight: string, speed = 90, pause = 2000) {
  const [displayed, setDisplayed] = useState('');
  const [showHighlight, setShowHighlight] = useState(false);
  const [isTyping, setIsTyping] = useState(true);
  useEffect(() => {
    let i = 0;
    let highlightStart = text.indexOf(highlight);
    let highlightEnd = highlightStart + highlight.length;
    let timer: any;
    let pauseTimer: any;
    let loop = () => {
      setDisplayed('');
      setShowHighlight(false);
      setIsTyping(true);
      i = 0;
      timer = setInterval(() => {
        if (i < highlightStart) {
          setDisplayed(text.slice(0, i + 1));
        } else if (i < highlightEnd) {
          setDisplayed(text.slice(0, highlightStart));
          setShowHighlight(true);
        } else {
          setDisplayed(text.slice(0, i + 1));
          setShowHighlight(false);
        }
        i++;
        if (i > text.length) {
          clearInterval(timer);
          setDisplayed(text);
          setShowHighlight(false);
          setIsTyping(false);
          pauseTimer = setTimeout(loop, pause);
        }
      }, speed);
    };
    loop();
    return () => { clearInterval(timer); clearTimeout(pauseTimer); };
  }, [text, highlight, speed, pause]);
  return { displayed, showHighlight, highlight, isTyping };
}

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState({
    totalBots: 0,
    onlineBots: 0,
    offlineBots: 0,
    messagesHandled: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [systemStats, setSystemStats] = useState({
    memory: 28,
    cpu: 35,
  });
  const [userInfo, setUserInfo] = useState({
    ip: '',
    browser: '',
    os: '',
  });
  const [logs, setLogs] = useState<any[]>([]);
  const [copySuccess, setCopySuccess] = useState(false);

  const typeText = 'AI机器人工作台，开启智能新体验！';
  const highlightText = '开启智能新体验！';
  const { displayed, showHighlight, highlight, isTyping } = useTypewriterLoop(typeText, highlightText, 90, 2000);

  useEffect(() => {
    loadDashboardData();
    
    // 获取用户IP
    fetch('https://api.ipify.org?format=json')
      .then(res => res.json())
      .then(data => setUserInfo(prev => ({ ...prev, ip: data.ip })));

    // 获取浏览器和操作系统信息
    const ua = window.navigator.userAgent;
    let browser = '未知';
    if (/chrome|crios|crmo/i.test(ua)) browser = 'Chrome';
    else if (/firefox|fxios/i.test(ua)) browser = 'Firefox';
    else if (/safari/i.test(ua)) browser = 'Safari';
    else if (/edg/i.test(ua)) browser = 'Edge';
    else if (/opera|opr/i.test(ua)) browser = 'Opera';
    else if (/msie|trident/i.test(ua)) browser = 'IE';
    
    let os = '未知';
    if (/windows/i.test(ua)) os = 'Windows';
    else if (/macintosh|mac os x/i.test(ua)) os = 'MacOS';
    else if (/android/i.test(ua)) os = 'Android';
    else if (/iphone|ipad|ipod/i.test(ua)) os = 'iOS';
    else if (/linux/i.test(ua)) os = 'Linux';
    
    setUserInfo(prev => ({ ...prev, browser, os }));

    // 获取日志
    const fetchLogs = async () => {
      try {
        const res = await fetch(`${API_SERVER_URL}/wss_log`);
        const data = await res.json();
        setLogs(data);
      } catch (e) {
        setLogs([]);
      }
    };
    fetchLogs();
    const interval = setInterval(fetchLogs, 2000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const box = document.getElementById('log-scroll-box');
    if (box) box.scrollTop = box.scrollHeight;
  }, [logs]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError('');

      const [
        { count: totalBots },
        { count: onlineBots },
        { count: offlineBots },
        { count: messagesHandled }
      ] = await Promise.all([
        supabase.from('bots').select('*', { count: 'exact' }),
        supabase.from('bots').select('*', { count: 'exact' }).eq('status', 'online'),
        supabase.from('bots').select('*', { count: 'exact' }).eq('status', 'offline'),
        supabase.from('bot_messages').select('*', { count: 'exact' })
      ]);

      setStats({
        totalBots: totalBots || 0,
        onlineBots: onlineBots || 0,
        offlineBots: offlineBots || 0,
        messagesHandled: messagesHandled || 0,
      });
    } catch (error) {
      console.error('加载数据失败:', error);
      setError('加载数据失败，请刷新页面重试');
    } finally {
      setLoading(false);
    }
  };

  // 复制日志内容
  const handleCopyLog = (log: any) => {
    const text = log.message || log.msg || log.content || '未知内容';
    navigator.clipboard.writeText(text).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 1500);
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="relative flex items-center justify-center h-20 w-20">
          <div className="absolute inset-0 rounded-full border-4 border-t-transparent border-b-transparent border-l-blue-400 border-r-purple-400 animate-spin-slow"></div>
          <div className="z-10 bg-gradient-to-br from-blue-400 to-purple-400 rounded-full p-4 shadow-lg animate-pulse">
            <Zap className="text-white" size={24} />
          </div>
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex space-x-1">
            <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:0s]"></span>
            <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
            <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-blue-50 via-white to-purple-50 py-10 px-4 md:px-8">
      {/* 欢迎区域 */}
      <div className="max-w-7xl mx-auto mb-12">
        <div className="bg-white rounded-2xl shadow-xl p-8 relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center gap-4 mb-6">
              <div className="bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl p-4 shadow-lg">
                <Bot className="text-white" size={32} />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
                  {isTyping ? (
                    <>
                      {displayed}
                      {showHighlight && (
                        <span className="text-indigo-500 font-bold animate-pulse">{highlight}</span>
                      )}
                      <span className="border-r-2 border-indigo-400 animate-pulse ml-1" style={{height: '1.2em', display: 'inline-block'}}></span>
                    </>
                  ) : (
                    <>{typeText}</>
                  )}
                </h1>
                <p className="text-gray-500 mt-2">当前环境：{userInfo.ip ? `${userInfo.ip} / ` : ''}{userInfo.browser} / {userInfo.os}</p>
              </div>
            </div>
          </div>
          <div className="absolute right-0 bottom-0 w-64 h-64 opacity-10 pointer-events-none">
            <img src="/img/astronaut.png" alt="背景" className="w-full h-full object-contain" />
          </div>
        </div>
      </div>

      {/* 统计卡片区 */}
      <div className="max-w-7xl mx-auto mb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Link to="/bots" className="group">
            <div className="bg-white rounded-2xl shadow-lg p-6 transition-all duration-300 hover:shadow-xl hover:scale-105 hover:bg-gradient-to-br hover:from-blue-50 hover:to-white border border-gray-100 hover:border-blue-200">
              <div className="flex items-center gap-4">
                <div className="bg-blue-100 rounded-xl p-3 group-hover:bg-blue-200 transition-colors">
                  <Bot className="text-blue-600" size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-700">总机器人数</h3>
                  <p className="text-3xl font-bold text-blue-600">{stats.totalBots}</p>
                </div>
              </div>
            </div>
          </Link>

          <Link to="/bots?status=online" className="group">
            <div className="bg-white rounded-2xl shadow-lg p-6 transition-all duration-300 hover:shadow-xl hover:scale-105 hover:bg-gradient-to-br hover:from-green-50 hover:to-white border border-gray-100 hover:border-green-200">
              <div className="flex items-center gap-4">
                <div className="bg-green-100 rounded-xl p-3 group-hover:bg-green-200 transition-colors">
                  <Wifi className="text-green-600" size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-700">在线机器人</h3>
                  <p className="text-3xl font-bold text-green-600">{stats.onlineBots}</p>
                </div>
              </div>
            </div>
          </Link>

          <Link to="/bots?status=offline" className="group">
            <div className="bg-white rounded-2xl shadow-lg p-6 transition-all duration-300 hover:shadow-xl hover:scale-105 hover:bg-gradient-to-br hover:from-red-50 hover:to-white border border-gray-100 hover:border-red-200">
              <div className="flex items-center gap-4">
                <div className="bg-red-100 rounded-xl p-3 group-hover:bg-red-200 transition-colors">
                  <WifiOff className="text-red-600" size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-700">离线机器人</h3>
                  <p className="text-3xl font-bold text-red-600">{stats.offlineBots}</p>
                </div>
              </div>
            </div>
          </Link>

          <Link to="/monitoring" className="group">
            <div className="bg-white rounded-2xl shadow-lg p-6 transition-all duration-300 hover:shadow-xl hover:scale-105 hover:bg-gradient-to-br hover:from-purple-50 hover:to-white border border-gray-100 hover:border-purple-200">
              <div className="flex items-center gap-4">
                <div className="bg-purple-100 rounded-xl p-3 group-hover:bg-purple-200 transition-colors">
                  <MessageSquare className="text-purple-600" size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-700">消息总数</h3>
                  <p className="text-3xl font-bold text-purple-600">{stats.messagesHandled}</p>
                </div>
              </div>
            </div>
          </Link>
        </div>
      </div>

      {/* 快捷功能区 */}
      <div className="max-w-7xl mx-auto mb-12">
        <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          <Settings className="text-blue-600" size={24} />
          快捷功能
          <span className="text-sm font-normal text-gray-400 ml-2">提供AI生活领域新功能</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <Link to="/bots/friends" className="group">
            <div className="bg-white rounded-2xl shadow-lg p-6 transition-all duration-300 hover:shadow-xl hover:scale-105 hover:bg-gradient-to-br hover:from-blue-50 hover:to-white border border-gray-100 hover:border-blue-200">
              <div className="flex items-center gap-4 mb-4">
                <img src="/img/ai_tool_5.png" alt="好友管理" className="w-12 h-12 object-contain" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 group-hover:text-blue-600 transition-colors">好友管理</h3>
                  <span className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-600 rounded-full">NEW</span>
                </div>
              </div>
              <p className="text-gray-500 text-sm">管理微信好友列表</p>
            </div>
          </Link>

          <Link to="/bots/moments" className="group">
            <div className="bg-white rounded-2xl shadow-lg p-6 transition-all duration-300 hover:shadow-xl hover:scale-105 hover:bg-gradient-to-br hover:from-green-50 hover:to-white border border-gray-100 hover:border-green-200">
              <div className="flex items-center gap-4 mb-4">
                <img src="/img/ai_tool_6.png" alt="朋友圈管理" className="w-12 h-12 object-contain" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 group-hover:text-green-600 transition-colors">朋友圈管理</h3>
                  <span className="inline-block px-2 py-1 text-xs bg-green-100 text-green-600 rounded-full">HOT</span>
                </div>
              </div>
              <p className="text-gray-500 text-sm">管理微信朋友圈内容</p>
            </div>
          </Link>

          <Link to="/monitoring" className="group">
            <div className="bg-white rounded-2xl shadow-lg p-6 transition-all duration-300 hover:shadow-xl hover:scale-105 hover:bg-gradient-to-br hover:from-purple-50 hover:to-white border border-gray-100 hover:border-purple-200">
              <div className="flex items-center gap-4 mb-4">
                <img src="/img/ai_tool_7.png" alt="日志监控" className="w-12 h-12 object-contain" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 group-hover:text-purple-600 transition-colors">日志监控</h3>
                </div>
              </div>
              <p className="text-gray-500 text-sm">实时监控机器人状态</p>
            </div>
          </Link>

          <Link to="/settings" className="group">
            <div className="bg-white rounded-2xl shadow-lg p-6 transition-all duration-300 hover:shadow-xl hover:scale-105 hover:bg-gradient-to-br hover:from-orange-50 hover:to-white border border-gray-100 hover:border-orange-200">
              <div className="flex items-center gap-4 mb-4">
                <img src="/img/ai_tool_2.png" alt="系统设置" className="w-12 h-12 object-contain" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 group-hover:text-orange-600 transition-colors">系统设置</h3>
                </div>
              </div>
              <p className="text-gray-500 text-sm">配置系统参数</p>
            </div>
          </Link>
        </div>
      </div>

      {/* 日志区域 */}
      <div className="max-w-7xl mx-auto">
        <div className="bg-[#18181c] rounded-2xl shadow-xl border border-[#23272f] overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-blue-600 to-purple-500 w-full" />
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#23272f] bg-[#1f1f23]">
            <h2 className="font-bold text-xl text-gray-100 tracking-wide flex items-center gap-2">
              <Activity className="text-blue-400" size={22} />
              运行日志
            </h2>
            <button
              onClick={() => {
                const box = document.getElementById('log-scroll-box');
                if (box) box.scrollTop = box.scrollHeight;
              }}
              className="p-2 bg-gradient-to-r from-blue-600 to-purple-500 text-white hover:scale-110 transition-all rounded-full shadow"
              title="滚动到底部"
            >
              <ChevronRight size={18} />
            </button>
          </div>
          <div
            id="log-scroll-box"
            className="p-6 overflow-y-auto font-mono text-sm text-gray-100 hide-scrollbar"
            style={{ height: '400px', background: '#18181c' }}
          >
            <table className="min-w-full text-sm border-0">
              <tbody>
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="text-center text-gray-500 py-6">暂无日志</td>
                  </tr>
                ) : (
                  logs.slice(-200).map((log, idx) => (
                    <tr key={idx} className={`${log.type === 'error' ? 'bg-[#2d1a1a] hover:bg-[#3a2323]' : 'hover:bg-[#23272f]'} transition-colors`}>
                      <td className="px-2 py-1 border-b border-[#23272f] whitespace-nowrap text-xs text-gray-400 align-top min-w-[120px]">
                        {log.timestamp.replace('T', ' ').replace('Z', '')}
                      </td>
                      <td className={`px-2 py-1 border-b border-[#23272f] whitespace-nowrap font-bold align-top min-w-[60px] ${
                        log.type === 'error' ? 'text-red-400' : 'text-blue-400'
                      }`}>
                        {log.type === 'info' ? '信息' : '错误'}
                      </td>
                      <td className="px-2 py-1 border-b border-[#23272f] align-top group relative">
                        <div className="break-all whitespace-pre-wrap">{log.message}</div>
                        <button
                          onClick={() => handleCopyLog(log)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-[#2a2a30] rounded"
                          title="复制日志"
                        >
                          <Copy size={14} className="text-gray-400" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 复制成功提示 */}
      {copySuccess && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-green-500 text-white rounded shadow-lg text-sm animate-fade-in-out flex items-center gap-2">
          <CheckCircle size={16} />
          日志内容已复制！
        </div>
      )}

      <style>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        @keyframes fade-in-out {
          0% { opacity: 0; transform: translate(-50%, -20px); }
          10% { opacity: 1; transform: translate(-50%, 0); }
          90% { opacity: 1; transform: translate(-50%, 0); }
          100% { opacity: 0; transform: translate(-50%, -20px); }
        }
        .animate-fade-in-out {
          animation: fade-in-out 1.5s ease-in-out forwards;
        }
      `}</style>
    </div>
  );
};

export default Dashboard;