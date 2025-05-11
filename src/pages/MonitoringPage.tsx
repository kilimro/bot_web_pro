import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Bot, Activity, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const API_SERVER_URL = import.meta.env.VITE_API_SERVER_URL;

interface BotStatus {
  id: string;
  name: string;
  key: string;
  status: 'online' | 'offline';
  onlineTime: string;
  loginTime: string;
  statusText: string;
}

const getBotOnlineStatus = async (key: string): Promise<Omit<BotStatus, 'id' | 'name' | 'key'>> => {
  try {
    const res = await axios.get(`${API_BASE_URL}/login/GetLoginStatus?key=${key}`);
    if (res.data?.Code === 200 && res.data?.Data?.loginState === 1) {
      return {
        status: 'online' as const,
        onlineTime: res.data.Data.onlineTime || '',
        loginTime: res.data.Data.loginTime || '',
        statusText: res.data.Data.loginErrMsg || '账号在线状态良好！'
      };
    } else {
      return {
        status: 'offline' as const,
        onlineTime: '',
        loginTime: '',
        statusText: res.data?.Text || '账号已离线'
      };
    }
  } catch (e) {
    return {
      status: 'offline' as const,
      onlineTime: '',
      loginTime: '',
      statusText: '状态获取失败'
    };
  }
};

const MonitoringPage: React.FC = () => {
  const [systemStatus, setSystemStatus] = useState<'online' | 'partial' | 'offline'>('online');
  const [botStatuses, setBotStatuses] = useState<BotStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [logs, setLogs] = useState<{timestamp: string, type: string, message: string}[]>([]);

  useEffect(() => {
    loadBots();
  }, []);

  const loadBots = async () => {
    try {
      setLoading(true);
      setError('');
      // 获取机器人列表（假设有 auth_key 字段）
      const { data: bots, error: botsError } = await supabase
        .from('bots')
        .select('id, nickname, auth_key');
      if (botsError) throw botsError;

      // 并发获取每个机器人的在线状态
      const botsWithStatus: BotStatus[] = await Promise.all(
        (bots || []).map(async (bot: any) => {
          const statusInfo = await getBotOnlineStatus(bot.auth_key);
          return {
            id: bot.id,
            name: bot.nickname || `机器人 ${bot.id.slice(0, 8)}`,
            key: bot.auth_key,
            ...statusInfo
          };
        })
      );
      setBotStatuses(botsWithStatus);
    } catch (error) {
      console.error('加载监控数据失败:', error);
      setError('加载数据失败，请刷新页面重试');
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    try {
      const res = await fetch(`${API_SERVER_URL}/wss_log`);//后端日志地址
      const data = await res.json();
      setLogs(data);
    } catch (e) {
      setLogs([]);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'text-green-500';
      case 'offline':
        return 'text-red-500';
      case 'partial':
        return 'text-yellow-500';
      default:
        return 'text-gray-500';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'online':
        return <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">正常</span>;
      case 'offline':
        return <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">离线</span>;
      case 'partial':
        return <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">不稳定</span>;
      default:
        return <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">未知</span>;
    }
  };

  useEffect(() => {
    fetchLogs(); // 初次加载立即拉取日志
    const interval = setInterval(fetchLogs, 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const box = document.getElementById('log-scroll-box');
    if (box) box.scrollTop = box.scrollHeight;
  }, [logs]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-2 md:px-6 py-6">
      {/* 顶部标题和状态区美化 */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-5">
          <div className="h-12 w-2 rounded bg-gradient-to-b from-blue-500 to-purple-400 mr-2" />
          <div className="flex items-center gap-4">
            <div className="bg-blue-100 text-blue-500 rounded-full p-4 shadow-sm">
              <Activity size={20} />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900 tracking-tight">系统监控</div>
              <div className="text-gray-400 text-sm mt-1">实时监控机器人运行状态和系统健康度</div>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={loadBots}
          className="bg-gradient-to-r from-blue-600 to-purple-500 border-0 rounded-xl font-bold shadow hover:scale-105 hover:shadow-xl transition-all px-6 py-2 text-white text-base flex items-center gap-2"
        >
          <RefreshCw size={18} /> 刷新数据
        </button>
      </div>
      {/* 状态区块 */}
      <div className="flex gap-5 mb-8 flex-wrap">
        <div className="flex items-center bg-white rounded-2xl shadow-xl border border-gray-100 px-5 py-3 min-w-[160px]">
          <Activity size={22} className={`mr-3 ${systemStatus === 'online' ? 'text-green-500' : systemStatus === 'partial' ? 'text-yellow-500' : 'text-red-500'}`} />
          <span className={`text-lg font-semibold ${systemStatus === 'online' ? 'text-green-600' : systemStatus === 'partial' ? 'text-yellow-600' : 'text-red-600'}`}>{systemStatus === 'online' ? '系统正常' : systemStatus === 'partial' ? '部分异常' : '系统离线'}</span>
        </div>
        <div className="flex items-center bg-white rounded-2xl shadow-xl border border-gray-100 px-5 py-3 min-w-[160px]">
          <div className={`w-3 h-3 rounded-full mr-3 ${systemStatus === 'online' ? 'bg-green-500' : systemStatus === 'partial' ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
          <span className="text-lg text-gray-700">WebSocket服务</span>
          <span className={`ml-3 text-base ${systemStatus === 'online' ? 'text-green-600' : systemStatus === 'partial' ? 'text-yellow-600' : 'text-red-600'}`}>{systemStatus === 'online' ? '正常' : systemStatus === 'partial' ? '不稳定' : '离线'}</span>
        </div>
      </div>
      {error && (
        <div className="mb-6 p-3 bg-red-100 text-red-700 rounded text-sm flex items-center">{error}</div>
      )}
      <div className="flex flex-col gap-8 mb-6">
        {/* 机器人状态监控卡片美化 */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden flex flex-col">
          <div className="h-1 bg-gradient-to-r from-blue-500 to-purple-400 w-full" />
          <div className="px-6 py-3 flex justify-between items-center border-b border-gray-100 bg-gray-50">
            <h2 className="font-bold text-lg text-gray-800 tracking-wide flex items-center gap-2">
              <Bot size={20} className="text-blue-500" /> 机器人状态监控
            </h2>
            <button 
              type="button"
              onClick={loadBots}
              className="p-2 bg-gradient-to-r from-blue-600 to-purple-500 text-white hover:scale-110 transition-all rounded-full shadow"
              title="刷新数据"
            >
              <RefreshCw size={18} />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full w-full text-xs">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-gray-500">机器人</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-500">状态</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-500">在线时长</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-500">最后登录</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-500">状态说明</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {botStatuses.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-4 text-center text-gray-400">暂无机器人</td>
                  </tr>
                ) : (
                  botStatuses.map((bot) => (
                    <tr key={bot.id} className="hover:bg-blue-50 transition">
                      <td className="px-3 py-2 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className={`flex-shrink-0 h-7 w-7 rounded-full bg-blue-100 flex items-center justify-center ${bot.status === 'online' ? 'text-green-500' : 'text-red-500'}`}>
                            {bot.status === 'online' ? <Wifi size={14} /> : <WifiOff size={14} />}
                          </div>
                          <div className="ml-2">
                            <div className="font-bold text-gray-900 text-sm">{bot.name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {bot.status === 'online' ? (
                          <span className="px-2 py-0.5 text-xs rounded bg-green-100 text-green-700 font-semibold">在线</span>
                        ) : (
                          <span className="px-2 py-0.5 text-xs rounded bg-red-100 text-red-700 font-semibold">离线</span>
                        )}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-gray-500">{bot.onlineTime || '-'}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-gray-500">{bot.loginTime || '-'}</td>
                      <td className="px-3 py-2 max-w-xs truncate text-gray-500" title={bot.statusText}>{bot.statusText}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 日志区块美化 */}
        <div className="bg-[#18181c] rounded-2xl shadow-xl border border-[#23272f] flex flex-col overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-blue-600 to-purple-500 w-full" />
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#23272f] bg-[#1f1f23]">
            <h2 className="font-bold text-xl text-gray-100 tracking-wide flex items-center gap-2">
              <Activity size={22} className="text-blue-400" /> 运行日志
            </h2>
            <button
              onClick={fetchLogs}
              className="p-2 bg-gradient-to-r from-blue-600 to-purple-500 text-white hover:scale-110 transition-all rounded-full shadow"
              title="立即刷新日志"
            >
              <RefreshCw size={18} />
            </button>
          </div>
          <div
            id="log-scroll-box"
            className="p-6 overflow-y-auto font-mono text-sm text-gray-100 hide-scrollbar"
            style={{ minHeight: 400, maxHeight: '60vh', background: '#18181c' }}
          >
            <table className="min-w-full text-sm border-0">
              <tbody>
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="text-center text-gray-500 py-6">暂无日志</td>
                  </tr>
                ) : (
                  logs.slice(0, 200).map((log, idx) => (
                    <tr key={idx} className={log.type === 'error' ? 'bg-[#2d1a1a] hover:bg-[#3a2323]' : 'hover:bg-[#23272f]'}>
                      <td className="px-2 py-1 border-b border-[#23272f] whitespace-nowrap text-xs text-gray-400 align-top min-w-[120px]">{log.timestamp.replace('T', ' ').replace('Z', '')}</td>
                      <td className={`px-2 py-1 border-b border-[#23272f] whitespace-nowrap font-bold align-top min-w-[60px] ${log.type === 'error' ? 'text-red-400' : 'text-blue-400'}`}>{log.type === 'info' ? '信息' : '错误'}</td>
                      <td className="px-2 py-1 border-b border-[#23272f] align-top" style={{wordBreak: 'break-all', whiteSpace: 'pre-wrap'}}>{log.message}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MonitoringPage;

/* 隐藏滚动条样式 */
<style>
{`
.hide-scrollbar::-webkit-scrollbar {
  display: none;
}
.hide-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
`}
</style>