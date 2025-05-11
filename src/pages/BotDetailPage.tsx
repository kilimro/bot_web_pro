import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Bot, RefreshCw, Trash2, AlertTriangle, Footprints, Hand } from 'lucide-react';
import { Bot as BotType, BotProfile } from '../types';
import { getBotDetail, getBotProfile, getUserProfile, updateBotProfile, deleteBot, updateStepNumber, setSendPat } from '../services/api';

const BotDetailPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [bot, setBot] = useState<BotType | null>(null);
  const [profile, setProfile] = useState<BotProfile | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // 新增状态
  const [stepNumber, setStepNumber] = useState<string>('');
  const [patValue, setPatValue] = useState<string>('');
  const [showStepModal, setShowStepModal] = useState(false);
  const [showPatModal, setShowPatModal] = useState(false);
  const [toolsLoading, setToolsLoading] = useState<{[key: string]: boolean}>({
    step: false,
    pat: false
  });

  // 在组件内顶部加全局提示状态
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    loadBotDetail();
  }, [id]);

  const loadBotDetail = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const [botData, profileData] = await Promise.all([
        getBotDetail(id),
        getBotProfile(id)
      ]);
      
      setBot(botData);
      setProfile(profileData);
    } catch (error) {
      console.error('加载机器人详情失败:', error);
      setError('加载机器人详情失败');
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshProfile = async () => {
    if (!bot?.id || !bot.auth_key || bot.status !== 'online') return;
    
    try {
      setRefreshing(true);
      setError('');
      
      const userProfile = await getUserProfile(bot.auth_key);
      if (userProfile.Code === 200) {
        const { userInfo, userInfoExt } = userProfile.Data;
        const profileData = {
          bot_id: bot.id,
          username: userInfo.userName.str,
          nickname: userInfo.nickName.str,
          bind_uin: userInfo.bindUin,
          bind_email: userInfo.bindEmail.str,
          bind_mobile: userInfo.bindMobile.str,
          sex: userInfo.sex,
          level: userInfo.level,
          experience: userInfo.experience,
          alias: userInfo.alias,
          big_head_img_url: userInfoExt.bigHeadImgUrl,
          small_head_img_url: userInfoExt.smallHeadImgUrl,
          updated_at: new Date().toISOString()
        };

        try {
          const updatedProfile = await updateBotProfile(profileData);
          setProfile(updatedProfile);
        } catch (error) {
          throw new Error('保存用户资料失败');
        }
      } else {
        throw new Error(userProfile.Text || '获取用户资料失败');
      }
    } catch (error) {
      console.error('刷新用户资料失败:', error);
      setError(error instanceof Error ? error.message : '刷新用户资料失败，请稍后重试');
    } finally {
      setRefreshing(false);
    }
  };

  const handleDelete = async () => {
    if (!bot?.id) return;
    try {
      await deleteBot(bot.id);
      navigate('/bots');
    } catch (error) {
      console.error('删除机器人失败:', error);
      setError('删除机器人失败');
    }
  };

  const handleUpdateStepNumber = async () => {
    if (!bot) return;
    try {
      setToolsLoading(prev => ({ ...prev, step: true }));
      setError('');
      const response = await updateStepNumber(bot.auth_key, Number(stepNumber));
      if (response.Code === 200) {
        setShowStepModal(false);
        setStepNumber('');
        setToast({ type: 'success', message: '步数修改成功' });
      } else {
        setToast({ type: 'error', message: response.Text || '修改步数失败' });
        throw new Error(response.Text || '修改步数失败');
      }
    } catch (error) {
      setToast({ type: 'error', message: error instanceof Error ? error.message : '修改步数失败' });
      console.error('修改步数失败:', error);
      setError(error instanceof Error ? error.message : '修改步数失败');
    } finally {
      setToolsLoading(prev => ({ ...prev, step: false }));
      setTimeout(() => setToast(null), 2000);
    }
  };

  const handleSetSendPat = async () => {
    if (!bot || !patValue.trim()) return;
    
    try {
      setToolsLoading(prev => ({ ...prev, pat: true }));
      setError('');
      
      const response = await setSendPat(bot.auth_key, patValue);
      if (response.Code === 200) {
        setShowPatModal(false);
        setPatValue('');
        setToast({ type: 'success', message: '拍一拍设置成功' });
      } else {
        setToast({ type: 'error', message: response.Text || '设置拍一拍失败' });
        throw new Error(response.Text || '设置拍一拍失败');
      }
    } catch (error) {
      setToast({ type: 'error', message: error instanceof Error ? error.message : '设置拍一拍失败' });
      console.error('设置拍一拍失败:', error);
      setError(error instanceof Error ? error.message : '设置拍一拍失败');
    } finally {
      setToolsLoading(prev => ({ ...prev, pat: false }));
      setTimeout(() => setToast(null), 2000);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700"></div>
      </div>
    );
  }

  if (!bot) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">未找到机器人信息</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-2 md:px-6 py-6">
      {/* 顶部信息卡片 */}
      <div className="flex flex-col md:flex-row items-center md:items-end bg-gradient-to-r from-blue-50 via-white to-purple-50 rounded-2xl shadow-lg border border-blue-100 p-6 mb-6 gap-6">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="w-24 h-24 rounded-full bg-white border-4 border-blue-200 shadow flex items-center justify-center overflow-hidden">
            {bot.avatar_url ? (
              <img src={bot.avatar_url} alt={bot.nickname || '机器人头像'} className="w-full h-full object-cover" />
            ) : (
              <Bot size={48} className="text-blue-300" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold text-gray-900 truncate">{bot.nickname || '未设置昵称'}</h1>
              <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                bot.status === 'online'
                  ? 'bg-green-100 text-green-700'
                  : bot.status === 'authenticating'
                  ? 'bg-yellow-100 text-yellow-700'
                  : 'bg-gray-200 text-gray-500'
              }`}>
                {bot.status === 'online' ? '在线' : bot.status === 'authenticating' ? '验证中' : '离线'}
              </span>
            </div>
            <div className="text-gray-500 text-sm truncate">ID: {bot.id}</div>
            <div className="text-gray-500 text-sm truncate">botID: {bot.wxid || '未登录'}</div>
          </div>
        </div>
        {/* 操作按钮区：竖直排列 */}
        <div className="flex flex-col gap-2 md:items-end w-full md:w-auto max-w-xs">
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="px-3 py-1.5 border border-red-400 text-red-500 bg-white rounded-md hover:bg-red-50 hover:text-red-700 transition-colors flex items-center shadow w-full text-sm font-medium"
          >
            <Trash2 size={15} className="mr-1" />删除
          </button>
          <button
            onClick={() => setShowStepModal(true)}
            disabled={bot.status !== 'online'}
            className={`px-3 py-1.5 bg-blue-600 text-white rounded-md transition-colors flex items-center justify-center font-medium shadow w-full text-sm ${
              bot.status !== 'online' ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700'
            }`}
          >
            <Footprints size={15} className="mr-1" />步数
          </button>
          <button
            onClick={() => setShowPatModal(true)}
            disabled={bot.status !== 'online'}
            className={`px-3 py-1.5 bg-green-600 text-white rounded-md transition-colors flex items-center justify-center font-medium shadow w-full text-sm ${
              bot.status !== 'online' ? 'opacity-50 cursor-not-allowed' : 'hover:bg-green-700'
            }`}
          >
            <Hand size={15} className="mr-1" />拍一拍
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-100 text-red-700 rounded-lg flex items-center">
          <AlertTriangle size={20} className="mr-2" />
          {error}
        </div>
      )}

      {/* 页面顶部全局toast提示 */}
      {toast && (
        <div className={`fixed top-6 left-1/2 transform -translate-x-1/2 z-50 px-6 py-2 rounded shadow-lg text-white text-sm font-medium transition-all ${toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}
          style={{ minWidth: '120px', textAlign: 'center' }}>
          {toast.message}
        </div>
      )}

      {/* 主体内容区，两栏自适应 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 左侧/上方：基本信息+个人资料 */}
        <div className="md:col-span-2 flex flex-col gap-6">
          {/* 基本信息卡片 */}
          <div className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
            <div className="px-5 py-3 bg-blue-50 border-b border-blue-100 flex items-center">
              <h2 className="font-bold text-blue-800 text-base">基本信息</h2>
            </div>
            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
              <div><span className="text-gray-500">机器人ID：</span><span className="text-gray-900 break-all">{bot.id}</span></div>
              <div><span className="text-gray-500">授权密钥：</span><span className="text-gray-900 break-all">{bot.auth_key}</span></div>
              <div><span className="text-gray-500">botID：</span><span className="text-gray-900">{bot.wxid || '未登录'}</span></div>
              <div><span className="text-gray-500">昵称：</span><span className="text-gray-900">{bot.nickname || '未设置'}</span></div>
              <div><span className="text-gray-500">创建时间：</span><span className="text-gray-900">{new Date(bot.created_at).toLocaleString('zh-CN')}</span></div>
              <div><span className="text-gray-500">最后活动：</span><span className="text-gray-900">{bot.last_active_at ? new Date(bot.last_active_at).toLocaleString('zh-CN') : '从未活动'}</span></div>
            </div>
          </div>

          {/* 个人资料卡片 */}
          <div className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
            <div className="px-5 py-3 bg-blue-50 border-b border-blue-100 flex items-center justify-between">
              <h2 className="font-bold text-blue-800 text-base">个人资料</h2>
              {bot.status === 'online' && (
                <button
                  onClick={handleRefreshProfile}
                  disabled={refreshing}
                  className={`p-2 text-blue-500 hover:text-blue-700 transition-colors rounded-full ${refreshing ? 'animate-spin' : ''}`}
                  title="刷新资料"
                >
                  <RefreshCw size={18} />
                </button>
              )}
            </div>
            <div className="p-5">
              {profile ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
                  <div><span className="text-gray-500">用户名：</span><span className="text-gray-900">{profile.username}</span></div>
                  <div><span className="text-gray-500">昵称：</span><span className="text-gray-900">{profile.nickname}</span></div>
                  <div><span className="text-gray-500">QQ号：</span><span className="text-gray-900">{profile.bind_uin || '未绑定'}</span></div>
                  <div><span className="text-gray-500">邮箱：</span><span className="text-gray-900">{profile.bind_email || '未绑定'}</span></div>
                  <div><span className="text-gray-500">手机号：</span><span className="text-gray-900">{profile.bind_mobile || '未绑定'}</span></div>
                  <div><span className="text-gray-500">性别：</span><span className="text-gray-900">{profile.sex === 1 ? '男' : profile.sex === 2 ? '女' : '未知'}</span></div>
                  <div><span className="text-gray-500">等级：</span><span className="text-gray-900">{profile.level}</span></div>
                  <div><span className="text-gray-500">经验值：</span><span className="text-gray-900">{profile.experience}</span></div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  {bot.status === 'online' ? (
                    <button
                      onClick={handleRefreshProfile}
                      disabled={refreshing}
                      className="text-blue-600 hover:text-blue-700 transition-colors flex items-center justify-center mx-auto"
                    >
                      <RefreshCw size={18} className={`mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                      获取用户资料
                    </button>
                  ) : (
                    '机器人未登录，无法获取资料'
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 右侧/下方：功能配置+状态信息+操作按钮 */}
        <div className="flex flex-col gap-6">
          {/* 功能配置卡片 */}
          <div className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
            <div className="px-5 py-3 bg-blue-50 border-b border-blue-100">
              <h2 className="font-bold text-blue-800 text-base">功能配置</h2>
            </div>
            <div className="p-5 grid grid-cols-1 gap-3">
              <Link to={`/bots/keyword-replies`} className="p-3 border rounded-lg hover:border-blue-500 cursor-pointer transition-colors block">
                <h3 className="font-medium mb-1">关键词回复</h3>
                <p className="text-xs text-gray-600">配置自动回复规则</p>
              </Link>
              <Link to={`/bots/plugins`} className="p-3 border rounded-lg hover:border-blue-500 cursor-pointer transition-colors block">
                <h3 className="font-medium mb-1">插件中心</h3>
                <p className="text-xs text-gray-600">设置API调用规则</p>
              </Link>
              <Link to={`/bots/ai-model`} className="p-3 border rounded-lg hover:border-blue-500 cursor-pointer transition-colors block">
                <h3 className="font-medium mb-1">AI大模型</h3>
                <p className="text-xs text-gray-600">配置AI对话功能</p>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* 删除确认模态框 */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center text-red-600 mb-4">
              <AlertTriangle size={24} className="mr-2" />
              <h3 className="text-lg font-medium">确认删除</h3>
            </div>
            <p className="text-gray-600 mb-6">
              您确定要删除这个机器人吗？此操作无法撤销，所有相关的数据都将被永久删除。
            </p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 修改步数模态框 */}
      {showStepModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-medium mb-4">修改bot步数</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                步数 (0-99999)
              </label>
              <input
                type="text"
                value={stepNumber}
                onChange={(e) => setStepNumber(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="请输入步数"
              />
            </div>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setShowStepModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleUpdateStepNumber}
                disabled={toolsLoading.step}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center"
              >
                {toolsLoading.step ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    修改中...
                  </>
                ) : (
                  '确认修改'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 设置拍一拍模态框 */}
      {showPatModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-medium mb-4">设置拍一拍</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                拍一拍文本
              </label>
              <input
                type="text"
                value={patValue}
                onChange={(e) => setPatValue(e.target.value)}
                placeholder="例如：大西瓜"
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setShowPatModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSetSendPat}
                disabled={toolsLoading.pat}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center"
              >
                {toolsLoading.pat ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    设置中...
                  </>
                ) : (
                  '确认设置'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BotDetailPage;