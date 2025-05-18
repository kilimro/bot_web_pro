import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, RefreshCw, AlertTriangle, Import, Check, Bot as BotIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import BotCard from '../components/Bot/BotCard';
import QrCodeLogin from '../components/Bot/QrCodeLogin';
import ImportBotForm from '../components/Bot/ImportBotForm';
import { Bot, LoginStatusResponse } from '../types';
import { getBotList, generateAuthKey, createBot, deleteBot, logoutBot, checkLoginStatus, getLoginStatus } from '../services/api';
import { supabase } from '../lib/supabase';

// 代理地区配置，可手动编辑
const REGION_PROXIES = [
  { label: '北京(默认)', value: 'beijing', proxy: '' }, // 默认
  { label: '河南', value: 'henan', proxy: 'socks5://GP0X6IG93S:91563817@106.42.31.35:13519' },
  // 可继续添加更多地区
];

const BotsPage: React.FC = () => {
  const [bots, setBots] = useState<Bot[]>([]);
  const [loading, setLoading] = useState(true);
  const [showImportForm, setShowImportForm] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreatingBot, setIsCreatingBot] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loginBotKey, setLoginBotKey] = useState<string | null>(null);
  const [region, setRegion] = useState(REGION_PROXIES[0].value);
  const [showRegionSelect, setShowRegionSelect] = useState(false);

  useEffect(() => {
    loadBots();
  }, []);

  const loadBots = async () => {
    try {
      setLoading(true);
      setError(null);
      const botsList = await getBotList();
      setBots(botsList);
    } catch (err) {
      setError('Failed to load bots. Please try again later.');
      console.error('Error fetching bots:', err);
    } finally {
      setLoading(false);
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
      await loadBots();
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
      await loadBots();
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
      await loadBots();
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
              <BotIcon size={20} />
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

      {loading ? (
        <div className="flex flex-col items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700"></div>
          <p className="mt-4 text-gray-600">加载中...</p>
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
              loadBots();
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
        <QrCodeLogin
          onClose={() => {
            setShowCreateModal(false);
            setLoginBotKey(null);
          }}
          onSuccess={loadBots}
          authKey={loginBotKey || undefined}
          regionProxy={REGION_PROXIES.find(r => r.value === region)?.proxy || ''}
        />
      )}
    </div>
  );
};

export default BotsPage;
