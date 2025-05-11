import React, { useState, useEffect } from 'react';
import { Bot, Activity, Users, Clock, Monitor, Globe, Smartphone, Info, AlertTriangle, CheckCircle, XCircle, Copy } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const API_SERVER_URL = import.meta.env.VITE_API_SERVER_URL;

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
    <div className="pb-4">
      <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 mb-1 tracking-tight">工作台</h1>
          <p className="text-sm text-gray-600">欢迎使用机器人管理系统，实时掌控您的业务与系统状态</p>
        </div>
      </div>
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">{error}</div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-5 mb-6">
        {statCards.map((card, index) => {
          // 主色条和主色大icon
          const cardStyles = [
            {
              bar: 'bg-blue-500',
              iconBg: 'text-blue-100',
              iconColor: 'text-blue-600',
              valueColor: 'text-blue-600',
            },
            {
              bar: 'bg-green-500',
              iconBg: 'text-green-100',
              iconColor: 'text-green-600',
              valueColor: 'text-green-600',
            },
            {
              bar: 'bg-red-500',
              iconBg: 'text-red-100',
              iconColor: 'text-red-600',
              valueColor: 'text-red-600',
            },
            {
              bar: 'bg-indigo-500',
              iconBg: 'text-indigo-100',
              iconColor: 'text-indigo-600',
              valueColor: 'text-indigo-600',
            },
            {
              bar: 'bg-blue-400',
              iconBg: 'text-blue-100',
              iconColor: 'text-blue-500',
              valueColor: 'text-blue-500',
            },
          ];
          const g = cardStyles[index] || cardStyles[0];
          return (
            <Link to={card.link} key={index} className="block group">
              <div className={`relative rounded-2xl bg-white shadow-lg group transition-all duration-200 hover:shadow-2xl hover:-translate-y-1 flex flex-col items-center justify-center min-h-[120px] p-0 overflow-hidden`}
                style={{ minHeight: '120px', height: '100%' }}>
                {/* 主色竖条 */}
                <div className={`absolute left-0 top-0 h-full w-1.5 ${g.bar}`}></div>
                {/* 大号半透明icon背景 */}
                <div className={`absolute right-4 top-1/2 -translate-y-1/2 opacity-80 text-7xl pointer-events-none select-none ${g.iconBg}`}>{React.cloneElement(card.icon, { className: `w-16 h-16` })}</div>
                {/* 主内容 */}
                <div className="z-10 flex flex-col items-center justify-center py-6">
                  {card.title !== '我的信息' && (
                    <span className={`text-4xl font-extrabold ${g.valueColor} mb-1 transition-all duration-200 group-hover:scale-110`}>{card.value}</span>
                  )}
                  {card.title === '我的信息' ? (
                    <>
                      <p className="text-xs text-gray-500 leading-4 mb-0.5 z-10">
                        IP：{userInfo.ip || '获取中...'}<br/>浏览器：{userInfo.browser}<br/>系统：{userInfo.os}
                      </p>
                      <h3 className="font-semibold text-base text-blue-700 z-10">{card.title}</h3>
                    </>
                  ) : (
                    <h3 className="font-semibold text-base z-10 text-gray-700">{card.title}</h3>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-2">
        {/* 日志区块（左侧2/3，黑色风格） */}
        <div className="bg-[#18181c] rounded-lg shadow border border-[#23272f] overflow-hidden xl:col-span-2 flex flex-col">
          <div className="px-4 py-2 border-b border-[#23272f] bg-[#1f1f23] flex items-center justify-between">
            <h2 className="font-bold text-gray-100 text-base tracking-wide">最近活动日志</h2>
          </div>
          <div className="divide-y divide-[#23272f] flex-1 overflow-y-auto hide-scrollbar" style={{ minHeight: 320, maxHeight: 420 }}>
            {logs.length === 0 ? (
              <div className="px-4 py-6 text-center text-gray-500 text-xs">暂无活动记录</div>
            ) : (
              logs.slice(0, 12).map((log, idx) => {
                let typeColor = 'text-blue-400';
                let typeLabel = '';
                if (log.type === 'error') { typeColor = 'text-red-400'; typeLabel = '错误'; }
                else if (log.type === 'success') { typeColor = 'text-green-400'; typeLabel = '成功'; }
                else if (log.type === 'warning') { typeColor = 'text-yellow-400'; typeLabel = '警告'; }
                return (
                  <div key={idx} className="px-4 py-3 flex items-start group hover:bg-[#23272f] transition duration-200">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {typeLabel && <span className={`font-mono text-xs ${typeColor} font-bold`}>{typeLabel}</span>}
                        <span className="text-[11px] text-gray-400">{log.timestamp ? new Date(log.timestamp).toLocaleString('zh-CN') : ''}</span>
                      </div>
                      <div className="font-mono text-sm text-gray-100 break-all whitespace-pre-wrap transition-all duration-200 group-hover:text-blue-200">{log.message || log.msg || log.content || '未知内容'}</div>
                    </div>
                    <button
                      className="ml-3 p-1 rounded hover:bg-[#23272f] text-gray-400 hover:text-blue-400 transition"
                      title="复制日志内容"
                      onClick={() => handleCopyLog(log)}
                    >
                      <Copy size={16} />
                    </button>
                  </div>
                );
              })
            )}
          </div>
          <div className="px-4 py-2 border-t border-[#23272f] text-right bg-[#1f1f23]">
            <Link to="/monitoring" className="text-xs text-blue-400 hover:text-blue-200">查看全部日志 &rarr;</Link>
          </div>
        </div>
        {/* 快速操作区（右侧1/3） */}
        <div className="bg-gradient-to-br from-blue-50 via-white to-blue-100 rounded-lg shadow border border-blue-50 overflow-hidden flex flex-col">
          <div className="px-4 py-2 bg-gradient-to-r from-blue-50 via-white to-blue-50 border-b border-blue-100">
            <h2 className="font-bold text-blue-800 text-sm">快速操作</h2>
          </div>
          <div className="p-3 flex-1 grid grid-cols-2 gap-2">
            {/* 新建机器人 */}
            <Link to="/bots" className="relative flex items-center gap-3 py-3 px-3 rounded-xl bg-blue-500 hover:bg-blue-600 border border-blue-500 transition shadow-sm group overflow-hidden hover:shadow-lg hover:scale-105 duration-200">
              <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-600 text-white shadow-sm group-hover:scale-110 transition-transform text-xl"><Bot size={26} /></span>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-white text-lg">新建机器人</div>
                <div className="text-sm text-blue-100">创建并配置新机器人</div>
              </div>
            </Link>
            {/* 生成授权密钥 */}
            <Link to="/auth-keys/new" className="relative flex items-center gap-3 py-3 px-3 rounded-xl bg-indigo-500 hover:bg-indigo-600 border border-indigo-500 transition shadow-sm group overflow-hidden hover:shadow-lg hover:scale-105 duration-200">
              <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-indigo-600 text-white shadow-sm group-hover:scale-110 transition-transform text-xl"><Activity size={26} /></span>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-white text-lg">生成授权密钥</div>
                <div className="text-sm text-indigo-100">创建新的授权密钥</div>
              </div>
            </Link>
            {/* 查看监控 */}
            <Link to="/monitoring" className="relative flex items-center gap-3 py-3 px-3 rounded-xl bg-cyan-500 hover:bg-cyan-600 border border-cyan-500 transition shadow-sm group overflow-hidden hover:shadow-lg hover:scale-105 duration-200">
              <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-cyan-600 text-white shadow-sm group-hover:scale-110 transition-transform text-xl"><Activity size={26} /></span>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-white text-lg">查看监控</div>
                <div className="text-sm text-cyan-100">实时监控机器人状态</div>
              </div>
            </Link>
            {/* 系统设置 */}
            <Link to="/settings" className="relative flex items-center gap-3 py-3 px-3 rounded-xl bg-gray-500 hover:bg-gray-600 border border-gray-500 transition shadow-sm group overflow-hidden hover:shadow-lg hover:scale-105 duration-200">
              <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-600 text-white shadow-sm group-hover:scale-110 transition-transform text-xl"><Clock size={26} /></span>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-white text-lg">系统设置</div>
                <div className="text-sm text-gray-100">配置系统参数</div>
              </div>
            </Link>
            {/* 好友管理 */}
            <Link to="/bots/friends" className="relative flex items-center gap-3 py-3 px-3 rounded-xl bg-indigo-400 hover:bg-indigo-500 border border-indigo-400 transition shadow-sm group overflow-hidden hover:shadow-lg hover:scale-105 duration-200">
              <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-indigo-500 text-white shadow-sm group-hover:scale-110 transition-transform text-xl"><Users size={26} /></span>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-white text-lg">好友管理</div>
                <div className="text-sm text-indigo-100">管理微信好友列表</div>
              </div>
            </Link>
            {/* 朋友圈管理 */}
            <Link to="/bots/moments" className="relative flex items-center gap-3 py-3 px-3 rounded-xl bg-yellow-400 hover:bg-yellow-500 border border-yellow-400 transition shadow-sm group overflow-hidden hover:shadow-lg hover:scale-105 duration-200">
              <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-yellow-500 text-white shadow-sm group-hover:scale-110 transition-transform text-xl"><Smartphone size={26} /></span>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-white text-lg">朋友圈管理</div>
                <div className="text-sm text-yellow-100">管理微信朋友圈内容</div>
              </div>
            </Link>
          </div>
        </div>
      </div>
      {/* 复制成功toast */}
      {copySuccess && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-green-500 text-white rounded shadow text-sm animate-fade-in-out">
          日志内容已复制！
        </div>
      )}
    </div>
  );
};

export default Dashboard;