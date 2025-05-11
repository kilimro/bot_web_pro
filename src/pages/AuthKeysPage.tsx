import React, { useState, useEffect } from 'react';
import { Plus, Copy, CheckCircle2, Trash2, RefreshCw, Clock, KeyRound } from 'lucide-react';
import { generateAuthKey, delayAuthKey } from '../services/api';
import { supabase } from '../lib/supabase';

interface AuthKey {
  id: string;
  key: string;
  createdAt: string;
  expiresAt: string;
  isUsed: boolean;
}

const AuthKeysPage: React.FC = () => {
  const [authKeys, setAuthKeys] = useState<AuthKey[]>([]);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isDelaying, setIsDelaying] = useState<boolean>(false);
  const [days, setDays] = useState<number>(30);
  const [count, setCount] = useState<number>(1);
  const [showSuccess, setShowSuccess] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [error, setError] = useState<string>('');
  const [delayKey, setDelayKey] = useState<string>('');
  const [delayDays, setDelayDays] = useState<number>(30);
  
  // 从 Supabase 加载授权密钥
  useEffect(() => {
    loadAuthKeys();
  }, []);

  const loadAuthKeys = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: keys, error } = await supabase
        .from('auth_keys')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (keys) {
        setAuthKeys(keys.map(key => ({
          id: key.id,
          key: key.key,
          createdAt: key.created_at,
          expiresAt: key.expires_at,
          isUsed: key.is_used
        })));
      }
    } catch (error) {
      console.error('加载授权密钥失败:', error);
      setError('加载授权密钥失败');
    }
  };

  const handleGenerateAuthKey = async () => {
    try {
      setIsGenerating(true);
      setError('');
      const response = await generateAuthKey(count, days);
      
      if (response.Code === 200 && response.Data && response.Data.length > 0) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('用户未登录');

        const now = new Date();
        const newKeys = response.Data.map((key: string) => {
          const expirationDate = new Date(now);
          expirationDate.setDate(expirationDate.getDate() + days);
          
          return {
            key: key,
            user_id: user.id,
            created_by: user.id,
            expires_at: expirationDate.toISOString(),
            is_used: false
          };
        });

        const { error } = await supabase
          .from('auth_keys')
          .insert(newKeys);

        if (error) throw error;

        await loadAuthKeys();
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
      } else {
        setError('生成授权密钥失败: ' + (response.Text || '未知错误'));
      }
    } catch (error) {
      console.error('生成授权密钥失败:', error);
      setError('生成授权密钥时发生错误');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDelayAuthKey = async () => {
    if (!delayKey) {
      setError('请输入要续期的授权密钥');
      return;
    }

    try {
      setIsDelaying(true);
      setError('');
      
      
      const response = await delayAuthKey(delayKey, delayDays);
      
      if (response.Code === 200 && response.Data) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('用户未登录');

        
        const { error } = await supabase
          .from('auth_keys')
          .update({ 
            expires_at: response.Data.expiryDate
          })
          .eq('key', delayKey)
          .eq('user_id', user.id);

        if (error) {
          console.error('更新数据库失败:', error);
          throw error;
        }

        await loadAuthKeys();
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
        setDelayKey('');
      } else {
        const errorMessage = response.Text || '续期失败';
        console.error('续期失败:', errorMessage);
        setError(`续期失败: ${errorMessage}`);
      }
    } catch (error) {
      console.error('续期时发生错误:', error);
      setError(`续期时发生错误: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setIsDelaying(false);
    }
  };
  
  const handleCopyAuthKey = (id: string, key: string) => {
    navigator.clipboard.writeText(key).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };
  
  const handleDeleteAuthKey = async (id: string) => {
    try {
      const { error } = await supabase
        .from('auth_keys')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await loadAuthKeys();
    } catch (error) {
      console.error('删除授权密钥失败:', error);
      setError('删除授权密钥失败');
    }
  };
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };
  
  const isExpired = (dateString: string) => {
    return new Date(dateString) < new Date();
  };

  return (
    <div className="min-h-[80vh] py-6 px-2 md:px-8 bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="flex items-center gap-3 mb-8">
        <div className="h-10 w-2 rounded bg-gradient-to-b from-blue-500 to-purple-400 mr-2" />
        <h1 className="text-2xl font-bold text-gray-800 tracking-tight flex items-center gap-2">
          <KeyRound className="text-blue-500" size={20} />
          授权密钥管理
        </h1>
      </div>
      <p className="text-gray-500 mb-8 ml-4">创建和管理机器人的授权密钥</p>

      {showSuccess && (
        <div className="mb-6 p-4 bg-green-50 text-green-800 rounded-xl flex items-center shadow-md animate-fade-in">
          <CheckCircle2 size={22} className="mr-2 text-green-500" />
          <span>操作成功！</span>
        </div>
      )}
      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-xl shadow-md animate-fade-in">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        {/* 生成密钥卡片 */}
        <div className="bg-white rounded-2xl shadow-xl border-l-4 border-blue-500">
          <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-white rounded-t-2xl border-b border-gray-100">
            <h2 className="font-bold text-blue-700 flex items-center gap-2"><Plus size={20} />生成新的授权密钥</h2>
          </div>
          <div className="p-6">
            <div className="flex flex-col gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">有效期（天）</label>
                <select
                  value={days}
                  onChange={(e) => setDays(Number(e.target.value))}
                  className="w-full p-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  <option value={7}>7天</option>
                  <option value={30}>30天</option>
                  <option value={90}>90天</option>
                  <option value={180}>180天</option>
                  <option value={365}>365天</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">生成数量</label>
                <select
                  value={count}
                  onChange={(e) => setCount(Number(e.target.value))}
                  className="w-full p-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  <option value={1}>1个</option>
                  <option value={5}>5个</option>
                  <option value={10}>10个</option>
                  <option value={20}>20个</option>
                </select>
              </div>
            </div>
            <button
              onClick={handleGenerateAuthKey}
              disabled={isGenerating}
              className={`w-full py-3 bg-gradient-to-r from-blue-600 to-purple-500 text-white rounded-xl font-bold text-lg shadow-md hover:scale-105 hover:shadow-xl transition-all duration-150 flex items-center justify-center gap-2 ${isGenerating ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  生成中...
                </>
              ) : (
                <>
                  <Plus size={22} className="" />
                  生成授权密钥
                </>
              )}
            </button>
          </div>
        </div>
        {/* 续期卡片 */}
        <div className="bg-white rounded-2xl shadow-xl border-l-4 border-green-500">
          <div className="px-6 py-4 bg-gradient-to-r from-green-50 to-white rounded-t-2xl border-b border-gray-100">
            <h2 className="font-bold text-green-700 flex items-center gap-2"><Clock size={20} />授权密钥续期</h2>
          </div>
          <div className="p-6">
            <div className="flex flex-col gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">授权密钥</label>
                <input
                  type="text"
                  value={delayKey}
                  onChange={(e) => setDelayKey(e.target.value)}
                  placeholder="输入要续期的授权密钥"
                  className="w-full p-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-green-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">续期天数</label>
                <select
                  value={delayDays}
                  onChange={(e) => setDelayDays(Number(e.target.value))}
                  className="w-full p-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-green-400"
                >
                  <option value={7}>7天</option>
                  <option value={30}>30天</option>
                  <option value={90}>90天</option>
                  <option value={180}>180天</option>
                  <option value={365}>365天</option>
                </select>
              </div>
            </div>
            <button
              onClick={handleDelayAuthKey}
              disabled={isDelaying}
              className={`w-full py-3 bg-gradient-to-r from-green-500 to-blue-400 text-white rounded-xl font-bold text-lg shadow-md hover:scale-105 hover:shadow-xl transition-all duration-150 flex items-center justify-center gap-2 ${isDelaying ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {isDelaying ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  续期中...
                </>
              ) : (
                <>
                  <Clock size={22} />
                  续期授权密钥
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 授权密钥列表 */}
      <div className="bg-white rounded-2xl shadow-xl border-l-4 border-blue-400 overflow-hidden">
        <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-white border-b border-gray-100 flex justify-between items-center">
          <h2 className="font-bold text-blue-700 flex items-center gap-2"><KeyRound size={20} />授权密钥列表</h2>
          <button 
            onClick={loadAuthKeys} 
            className="p-2 rounded-full bg-blue-50 hover:bg-blue-100 text-blue-500 hover:text-blue-700 shadow-sm transition-all"
            title="刷新列表"
          >
            <RefreshCw size={20} />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gradient-to-r from-blue-50 to-white">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-blue-700 uppercase tracking-wider">授权密钥</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-blue-700 uppercase tracking-wider">创建时间</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-blue-700 uppercase tracking-wider">过期时间</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-blue-700 uppercase tracking-wider">状态</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-blue-700 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {authKeys.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-400 text-lg">
                    <div className="flex flex-col items-center gap-2">
                      <KeyRound size={36} className="text-blue-200" />
                      暂无授权密钥，点击上方按钮生成
                    </div>
                  </td>
                </tr>
              ) : (
                authKeys.map((authKey) => (
                  <tr key={authKey.id} className="hover:bg-blue-50 transition-all duration-150 hover:shadow-md">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="text-sm font-mono text-gray-900 mr-2 truncate max-w-xs">
                          {authKey.key}
                        </div>
                        <button
                          onClick={() => handleCopyAuthKey(authKey.id, authKey.key)}
                          className="text-gray-400 hover:text-blue-600 focus:outline-none transition-all duration-100 hover:scale-125"
                          title="复制密钥"
                        >
                          {copiedId === authKey.id ? (
                            <CheckCircle2 size={18} className="text-green-500 animate-bounce" />
                          ) : (
                            <Copy size={18} />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(authKey.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(authKey.expiresAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {isExpired(authKey.expiresAt) ? (
                        <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-700 shadow">已过期</span>
                      ) : authKey.isUsed ? (
                        <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-700 shadow">已使用</span>
                      ) : (
                        <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-700 shadow">未使用</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleDeleteAuthKey(authKey.id)}
                        className="text-red-500 hover:text-red-700 focus:outline-none transition-all duration-100 hover:scale-125"
                        title="删除密钥"
                      >
                        <Trash2 size={18} />
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
  );
};

export default AuthKeysPage;