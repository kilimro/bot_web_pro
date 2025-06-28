import React, { useState, useEffect } from 'react';
import { Bot, Activity, Users, Clock, Monitor, Globe, Smartphone, TrendingUp, AlertTriangle, CheckCircle, XCircle, Copy, BarChart3, Zap, Shield } from 'lucide-react';
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
  const [recentEvents, setRecentEvents] = useState<{
    id: string;
    event: string;
    time: string;
    status: 'success' | 'warning' | 'error' | 'info';
  }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [systemStats, setSystemStats] = useState({
    memory: 28,
    cpu: 35,
    uptime: '7天12小时',
    requests: 1247
  });
  const [userInfo, setUserInfo] = useState({
    ip: '',
    browser: '',
    os: '',
  });
  const [logs, setLogs] = useState<any[]>([]);
  const [copySuccess, setCopySuccess] = useState(false);

  const typeText = '智能化机器人管理平台，开启企业级AI新体验！';
  const highlightText = '企业级AI新体验！';
  const { displayed, showHighlight, highlight, isTyping } = useTypewriterLoop(typeText, highlightText, 90, 3000);

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
      .then(data => setUserInfo(prev => ({ ...prev, ip: data.ip })))
      .catch(() => setUserInfo(prev => ({ ...prev, ip: '未知' })));

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

    // 获取最近活动日志
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
    const interval = setInterval(fetchLogs, 5000);

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

      const formattedEvents = events?.map(event => ({
        id: event.id,
        event: `${event.bots?.nickname || '未知机器人'} - ${event.message}`,
        time: new Date(event.created_at).toLocaleString('zh-CN'),
        status: event.event_type as 'success' | 'warning' | 'error' | 'info'
      })) || [];

      setRecentEvents(formattedEvents);
    } catch (error) {
      console.error('加载最近活动失败:', error);
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
        <div className="loading-enterprise w-16 h-16">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-x-hidden animate-fade-in">
      {/* 顶部欢迎区 */}
      <div className="max-w-7xl mx-auto px-4 pt-6 mb-8">
        <div className="card-enterprise p-8 bg-gradient-to-br from-blue-50 via-white to-indigo-50 border-l-4 border-blue-500">
          <div className="flex flex-col lg:flex-row items-center justify-between">
            <div className="flex-1 mb-6 lg:mb-0">
              <div className="relative h-16 mb-4">
                <div className="invisible h-full flex items-center text-3xl lg:text-4xl font-bold">{typeText}</div>
                <h1 className="absolute left-0 top-0 w-full h-full flex items-center text-3xl lg:text-4xl font-bold text-gray-900">
                  <span className="inline-block mr-3 text-4xl">🚀</span>
                  <span>
                    {isTyping ? (
                      <>
                        {displayed}
                        {showHighlight && (
                          <span className="text-blue-600 font-bold animate-pulse">{highlight}</span>
                        )}
                        <span className="border-r-2 border-blue-500 animate-pulse ml-1" style={{height: '1.2em', display: 'inline-block'}}></span>
                      </>
                    ) : (
                      <>{typeText}</>
                    )}
                  </span>
                </h1>
              </div>
              <p className="text-gray-600 text-lg mb-4 leading-relaxed">
                基于现代化架构的智能机器人管理系统，提供企业级的稳定性、安全性和可扩展性。
              </p>
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                <div className="flex items-center space-x-2">
                  <Globe size={16} className="text-blue-500" />
                  <span>{userInfo.ip || '获取中...'}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Monitor size={16} className="text-green-500" />
                  <span>{userInfo.browser}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Smartphone size={16} className="text-purple-500" />
                  <span>{userInfo.os}</span>
                </div>
              </div>
              <div className="mt-6">
                <Link to="/bots" className="btn-primary-enterprise inline-flex items-center space-x-2">
                  <span>开始管理</span>
                  <TrendingUp size={18} />
                </Link>
              </div>
            </div>
            <div className="flex-shrink-0">
              <img 
                src="/img/astronaut.png" 
                alt="AI插画" 
                className="w-48 lg:w-64 select-none pointer-events-none animate-float" 
              />
            </div>
          </div>
        </div>
      </div>

      {/* 统计卡片区 */}
      <div className="max-w-7xl mx-auto px-4 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="stat-card-enterprise">
            <div className="flex items-center justify-between">
              <div>
                <div className="stat-label-enterprise">机器人总数</div>
                <div className="stat-value-enterprise text-blue-600">{stats.totalBots}</div>
                <div className="stat-change-positive text-sm mt-1">+12% 本月</div>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Bot size={24} className="text-blue-600" />
              </div>
            </div>
          </div>

          <div className="stat-card-enterprise">
            <div className="flex items-center justify-between">
              <div>
                <div className="stat-label-enterprise">在线状态</div>
                <div className="stat-value-enterprise text-green-600">{stats.onlineBots}</div>
                <div className="stat-change-positive text-sm mt-1">实时监控</div>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <Activity size={24} className="text-green-600" />
              </div>
            </div>
          </div>

          <div className="stat-card-enterprise">
            <div className="flex items-center justify-between">
              <div>
                <div className="stat-label-enterprise">消息处理</div>
                <div className="stat-value-enterprise text-purple-600">{stats.messagesHandled}</div>
                <div className="stat-change-positive text-sm mt-1">+8.5% 今日</div>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <BarChart3 size={24} className="text-purple-600" />
              </div>
            </div>
          </div>

          <div className="stat-card-enterprise">
            <div className="flex items-center justify-between">
              <div>
                <div className="stat-label-enterprise">系统状态</div>
                <div className="stat-value-enterprise text-indigo-600">优秀</div>
                <div className="stat-change-positive text-sm mt-1">运行时长 {systemStats.uptime}</div>
              </div>
              <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
                <Shield size={24} className="text-indigo-600" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 功能快捷入口 */}
      <div className="max-w-7xl mx-auto px-4 mb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
          <Zap className="mr-2 text-blue-500" size={24} />
          快捷功能
          <span className="ml-3 text-sm font-normal text-gray-500">一键访问核心功能模块</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <Link to="/bots/friends" className="card-enterprise p-6 group hover:border-pink-200">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-pink-100 rounded-xl flex items-center justify-center group-hover:bg-pink-200 transition-colors">
                <Users size={24} className="text-pink-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 group-hover:text-pink-700">好友管理</h3>
                <p className="text-sm text-gray-500">管理机器人好友列表</p>
              </div>
            </div>
          </Link>

          <Link to="/bots/moments" className="card-enterprise p-6 group hover:border-yellow-200">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center group-hover:bg-yellow-200 transition-colors">
                <Activity size={24} className="text-yellow-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 group-hover:text-yellow-700">朋友圈</h3>
                <p className="text-sm text-gray-500">发布和管理朋友圈</p>
              </div>
            </div>
          </Link>

          <Link to="/monitoring" className="card-enterprise p-6 group hover:border-green-200">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center group-hover:bg-green-200 transition-colors">
                <Monitor size={24} className="text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 group-hover:text-green-700">系统监控</h3>
                <p className="text-sm text-gray-500">实时监控系统状态</p>
              </div>
            </div>
          </Link>

          <Link to="/settings" className="card-enterprise p-6 group hover:border-blue-200">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                <Settings size={24} className="text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 group-hover:text-blue-700">系统设置</h3>
                <p className="text-sm text-gray-500">配置系统参数</p>
              </div>
            </div>
          </Link>
        </div>
      </div>

      {/* 活动日志区 */}
      <div className="max-w-7xl mx-auto px-4 mb-8">
        <div className="card-enterprise overflow-hidden">
          <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-bold text-gray-900 flex items-center">
              <Activity className="mr-2 text-blue-500" size={20} />
              系统活动日志
            </h2>
            <Link to="/monitoring" className="text-sm text-blue-600 hover:text-blue-800 font-medium">
              查看全部 →
            </Link>
          </div>
          <div className="p-6">
            {logs.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Activity size={48} className="mx-auto mb-4 text-gray-300" />
                <p>暂无活动记录</p>
              </div>
            ) : (
              <div className="space-y-3">
                {logs.slice(0, 6).map((log, idx) => {
                  let statusColor = 'text-blue-500';
                  let statusBg = 'bg-blue-50';
                  let statusIcon = <CheckCircle size={16} />;
                  
                  if (log.type === 'error') { 
                    statusColor = 'text-red-500'; 
                    statusBg = 'bg-red-50';
                    statusIcon = <XCircle size={16} />;
                  } else if (log.type === 'warning') { 
                    statusColor = 'text-yellow-500'; 
                    statusBg = 'bg-yellow-50';
                    statusIcon = <AlertTriangle size={16} />;
                  }
                  
                  return (
                    <div key={idx} className="flex items-start space-x-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors group">
                      <div className={`w-8 h-8 ${statusBg} rounded-lg flex items-center justify-center ${statusColor} flex-shrink-0`}>
                        {statusIcon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-gray-500 font-medium">
                            {log.timestamp ? new Date(log.timestamp).toLocaleString('zh-CN') : ''}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 break-all leading-relaxed">
                          {log.message || log.msg || log.content || '未知内容'}
                        </p>
                      </div>
                      <button
                        className="opacity-0 group-hover:opacity-100 p-2 text-gray-400 hover:text-blue-500 transition-all rounded-lg hover:bg-white"
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
          </div>
        </div>
      </div>

      {/* 复制成功提示 */}
      {copySuccess && (
        <div className="notification-success">
          <CheckCircle size={20} className="mr-2" />
          日志内容已复制到剪贴板
        </div>
      )}
    </div>
  );
};

export default Dashboard;