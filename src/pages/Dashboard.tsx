import React, { useState, useEffect } from 'react';
import { Bot, Activity, Users, Clock, Monitor, Globe, Smartphone, Info, AlertTriangle, CheckCircle, XCircle, Copy } from 'lucide-react';
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

// astronaut动画样式
const astronautAnim = {
  animation: 'floatY 3s ease-in-out infinite',
};

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState({
    totalBots: 0,
    onlineBots: 0,
    offlineBots: 0,
    messagesHandled: 0,
  });
  const [recentEvents, setRecentEvents] = useState<{
    id: string;
    event: string;
    time: string;
    status: 'success' | 'warning' | 'error' | 'info';
  }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [systemStats, setSystemStats] = useState({
    memory: 28, // 单位：%，模拟数据
    cpu: 35,    // 单位：%，模拟数据
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
    
    // 订阅实时更新
    const botsSubscription = supabase
      .channel('bots-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'bots'
      }, () => {
        loadDashboardData();
      })
      .subscribe();

    const eventsSubscription = supabase
      .channel('events-changes')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'bot_events'
      }, () => {
        loadRecentEvents();
      })
      .subscribe();

    // 获取用户IP
    fetch('https://api.ipify.org?format=json')
      .then(res => res.json())
      .then(data => setUserInfo(prev => ({ ...prev, ip: data.ip })));
    // 获取浏览器和操作系统
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

    // 获取最近活动日志，定时轮询
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

    return () => {
      botsSubscription.unsubscribe();
      eventsSubscription.unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError('');

      // 获取机器人统计数据
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

      await loadRecentEvents();
    } catch (error) {
      console.error('加载数据失败:', error);
      setError('加载数据失败，请刷新页面重试');
    } finally {
      setLoading(false);
    }
  };

  const loadRecentEvents = async () => {
    try {
      const { data: events, error: eventsError } = await supabase
        .from('bot_events')
        .select(`
          id,
          event_type,
          message,
          created_at,
          bots (
            nickname
          )
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      if (eventsError) throw eventsError;

      const formattedEvents = events.map(event => ({
        id: event.id,
        event: `${event.bots?.nickname || '未知机器人'} - ${event.message}`,
        time: new Date(event.created_at).toLocaleString('zh-CN'),
        status: event.event_type as 'success' | 'warning' | 'error' | 'info'
      }));

      setRecentEvents(formattedEvents);
    } catch (error) {
      console.error('加载最近活动失败:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-800';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      case 'info':
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  const statCards = [
    {
      title: '总机器人数',
      value: stats.totalBots,
      icon: <Bot size={24} className="text-blue-600" />,
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-700',
      link: '/bots',
    },
    {
      title: '在线机器人',
      value: stats.onlineBots,
      icon: <Activity size={24} className="text-green-600" />,
      bgColor: 'bg-green-50',
      textColor: 'text-green-700',
      link: '/bots?status=online',
    },
    {
      title: '离线机器人',
      value: stats.offlineBots,
      icon: <Clock size={24} className="text-red-600" />,
      bgColor: 'bg-red-50',
      textColor: 'text-red-700',
      link: '/bots?status=offline',
    },
    {
      title: '系统内存占用',
      value: systemStats.memory + '%',
      icon: <Monitor size={24} className="text-indigo-600" />,
      bgColor: 'bg-indigo-50',
      textColor: 'text-indigo-700',
      link: '#',
    },
    {
      title: '我的信息',
      value: '',
      icon: <Globe size={24} className="text-blue-500" />,
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-700',
      link: '#',
      custom: null
    },
  ];

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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-x-hidden">
      {/* 顶部欢迎区+数据区 */}
      <div className="max-w-7xl mx-auto px-4 pt-10 grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
        {/* 欢迎大卡片+插画+渐变背景色 */}
        <div className="col-span-2 rounded-3xl shadow-lg p-10 flex flex-col justify-between min-h-[280px] relative overflow-hidden bg-gradient-to-br from-[#e8eafd] to-[#e0e7fa]">
          <div className="mb-10">
            <div className="relative h-14 mb-3">
              {/* 占位完整文本，block级，完全一致的样式 */}
              <div className="invisible h-full flex items-center text-2xl md:text-3xl font-bold">{typeText}</div>
              {/* 打字内容绝对定位，100%高，flex居中 */}
              <h1 className="absolute left-0 top-0 w-full h-full flex items-center text-2xl md:text-3xl font-bold text-gray-900">
                <span className="inline-block mr-2">🤖</span>
                <span>
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
                </span>
              </h1>
            </div>
            <p className="text-gray-500 text-base mb-2">AI驱动，助力高效管理，数据实时可见，操作更便捷。</p>
            <p className="text-xs text-gray-400 mb-8">
              当前环境：{userInfo.ip ? `${userInfo.ip} / ` : ''}{userInfo.browser} / {userInfo.os}
            </p>
            <div className="mt-8">
              <Link to="/bots" className="inline-block px-6 py-2 rounded-full bg-indigo-500 hover:bg-indigo-600 text-white font-semibold shadow transition text-base">去管理 &rarr;</Link>
            </div>
          </div>
          {/* astronaut插画+上下晃动动画 */}
          <img src="/img/astronaut.png" alt="AI插画" className="absolute right-4 bottom-0 w-56 md:w-64 select-none pointer-events-none" style={astronautAnim} />
        </div>
        {/* 数据卡片区（纯色背景，插画右侧，左侧丰富文案） */}
        <div className="flex flex-col gap-6 h-full">
          <div className="bg-blue-50 rounded-3xl shadow-md p-6 flex items-center justify-between min-h-[80px] relative">
            <div>
              <div className="text-lg font-bold text-gray-900 mb-1">当前已接入机器人</div>
              <div className="text-2xl font-extrabold text-indigo-600">{stats.totalBots}</div>
            </div>
            <img src="/img/ai_tool_2.png" alt="机器人" className="w-16 h-16 object-contain" />
          </div>
          <div className="bg-green-50 rounded-3xl shadow-md p-6 flex items-center justify-between min-h-[80px] relative">
            <div>
              <div className="text-lg font-bold text-gray-900 mb-1">实时在线</div>
              <div className="text-2xl font-extrabold text-green-500">{stats.onlineBots}</div>
            </div>
            <img src="/img/ai_tool_3.png" alt="在线" className="w-16 h-16 object-contain" />
          </div>
          <div className="bg-red-50 rounded-3xl shadow-md p-6 flex items-center justify-between min-h-[80px] relative">
            <div>
              <div className="text-lg font-bold text-gray-900 mb-1">离线待命</div>
              <div className="text-2xl font-extrabold text-red-400">{stats.offlineBots}</div>
            </div>
            <img src="/img/ai_tool_4.png" alt="离线" className="w-16 h-16 object-contain" />
          </div>
        </div>
      </div>
      {/* 工具/功能区 */}
      <div className="max-w-7xl mx-auto px-4 mt-12">
        <h2 className="text-lg font-bold text-gray-900 mb-4">快捷操作 <span className="text-sm font-normal text-gray-400 ml-2">提供AI生活领域新功能</span></h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
          <Link to="/bots/friends" className="bg-white rounded-2xl shadow-md p-6 flex items-center gap-4 hover:shadow-xl transition group relative">
            <img src="/img/ai_tool_5.png" alt="好友管理" className="w-12 h-12 object-contain" />
            <div>
              <div className="text-base font-bold text-gray-900 mb-1 flex items-center">好友管理 <span className="ml-2 text-xs bg-pink-100 text-pink-500 rounded px-2 py-0.5 font-semibold">NEW</span></div>
              <div className="text-gray-500 text-sm">管理好友列表</div>
            </div>
          </Link>
          <Link to="/bots/moments" className="bg-white rounded-2xl shadow-md p-6 flex items-center gap-4 hover:shadow-xl transition group relative">
            <img src="/img/ai_tool_6.png" alt="朋友圈管理" className="w-12 h-12 object-contain" />
            <div>
              <div className="text-base font-bold text-gray-900 mb-1 flex items-center">朋友圈管理 <span className="ml-2 text-xs bg-yellow-100 text-yellow-500 rounded px-2 py-0.5 font-semibold">NEW</span></div>
              <div className="text-gray-500 text-sm">管理朋友圈内容</div>
            </div>
          </Link>
          <Link to="/monitoring" className="bg-white rounded-2xl shadow-md p-6 flex items-center gap-4 hover:shadow-xl transition group relative">
            <img src="/img/ai_tool_7.png" alt="日志监控" className="w-12 h-12 object-contain" />
            <div>
              <div className="text-base font-bold text-gray-900 mb-1">日志监控</div>
              <div className="text-gray-500 text-sm">实时监控机器人状态</div>
            </div>
          </Link>
          <Link to="/settings" className="bg-white rounded-2xl shadow-md p-6 flex items-center gap-4 hover:shadow-xl transition group relative">
            <img src="/img/ai_tool_2.png" alt="系统设置" className="w-12 h-12 object-contain" />
            <div>
              <div className="text-base font-bold text-gray-900 mb-1">系统设置</div>
              <div className="text-gray-500 text-sm">配置系统参数</div>
            </div>
          </Link>
        </div>
      </div>
      {/* 日志区块 */}
      <div className="max-w-7xl mx-auto px-4 mt-12 mb-8">
        <h2 className="text-lg font-bold text-gray-900 mb-4">最近活动日志</h2>
        <div className="bg-white rounded-3xl shadow-lg p-6 min-h-[180px]">
          {logs.length === 0 ? (
            <div className="text-center text-gray-400 text-sm py-8">暂无活动记录</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {logs.slice(0, 8).map((log, idx) => {
                let typeColor = 'text-blue-400';
                let typeLabel = '';
                if (log.type === 'error') { typeColor = 'text-red-400'; typeLabel = '错误'; }
                else if (log.type === 'success') { typeColor = 'text-green-400'; typeLabel = '成功'; }
                else if (log.type === 'warning') { typeColor = 'text-yellow-400'; typeLabel = '警告'; }
                return (
                  <div key={idx} className="py-3 flex items-start group hover:bg-gray-50 transition duration-200 px-2 rounded-xl">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {typeLabel && <span className={`font-mono text-xs ${typeColor} font-bold`}>{typeLabel}</span>}
                        <span className="text-[11px] text-gray-400">{log.timestamp ? new Date(log.timestamp).toLocaleString('zh-CN') : ''}</span>
                      </div>
                      <div className="font-mono text-sm text-gray-700 break-all whitespace-pre-wrap transition-all duration-200 group-hover:text-blue-600">{log.message || log.msg || log.content || '未知内容'}</div>
                    </div>
                    <button
                      className="ml-3 p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-blue-400 transition"
                      title="复制日志内容"
                      onClick={() => handleCopyLog(log)}
                    >
                      <Copy size={16} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
          <div className="text-right mt-4">
            <Link to="/monitoring" className="text-xs text-blue-500 hover:text-blue-700">查看全部日志 &rarr;</Link>
          </div>
        </div>
      </div>
      {/* 复制成功toast */}
      {copySuccess && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-green-500 text-white rounded shadow text-sm animate-fade-in-out">
          日志内容已复制！
        </div>
      )}
      {/* astronaut动画keyframes */}
      <style>{`
        @keyframes floatY {
          0% { transform: translateY(0); }
          50% { transform: translateY(-18px); }
          100% { transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default Dashboard;
