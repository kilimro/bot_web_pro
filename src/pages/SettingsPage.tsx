import React, { useState, useEffect } from 'react';
import { Save, AlertTriangle } from 'lucide-react';
import { updateAdminPassword } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface SystemSettings {
  systemName: string;
  apiBaseUrl: string;
  wsBaseUrl: string;
  adminUsername: string;
}

const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<SystemSettings>({
    systemName: import.meta.env.VITE_APP_NAME,
    apiBaseUrl: import.meta.env.VITE_API_BASE_URL,
    wsBaseUrl: import.meta.env.VITE_WS_BASE_URL,
    adminUsername: user?.email || '',
  });

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const [showError, setShowError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user?.email) {
      setSettings(prev => ({
        ...prev,
        adminUsername: user.email
      }));
    }
  }, [user]);

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setShowError('新密码和确认密码不匹配');
      return;
    }

    try {
      setIsLoading(true);
      setShowError('');
      await updateAdminPassword(currentPassword, newPassword);
      setShowSaveSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setShowSaveSuccess(false), 3000);
    } catch (error) {
      setShowError(error instanceof Error ? error.message : '密码更新失败');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-2 md:px-6 py-8">
      <div className="flex items-center justify-between mb-10">
        <div className="flex items-center gap-5">
          <div className="h-12 w-2 rounded bg-gradient-to-b from-blue-500 to-purple-400 mr-2" />
          <div className="flex items-center gap-4">
            <div className="bg-blue-100 text-blue-500 rounded-full p-4 shadow-sm">
              <Save size={20} />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900 tracking-tight">系统设置</div>
              <div className="text-gray-400 text-sm mt-1">配置系统基本参数和功能</div>
            </div>
          </div>
        </div>
      </div>

      {showSaveSuccess && (
        <div className="mb-6 p-4 bg-green-100 text-green-800 rounded-lg flex items-center">
          <AlertTriangle size={20} className="mr-2" />
          <span>设置已成功保存</span>
        </div>
      )}

      {showError && (
        <div className="mb-6 p-4 bg-red-100 text-red-800 rounded-lg">
          {showError}
        </div>
      )}

      <div className="space-y-10">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-blue-500 to-purple-400 w-full" />
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
            <Save size={20} className="text-blue-500" />
            <h2 className="font-bold text-lg text-gray-800 tracking-wide">基本设置</h2>
          </div>
          <div className="p-8 space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                系统名称
              </label>
              <input
                type="text"
                value={settings.systemName}
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-100"
                disabled
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                API基础地址
              </label>
              <input
                type="text"
                value={settings.apiBaseUrl}
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-100"
                disabled
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                WebSocket地址
              </label>
              <input
                type="text"
                value={settings.wsBaseUrl}
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-100"
                disabled
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-blue-500 to-purple-400 w-full" />
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
            <AlertTriangle size={20} className="text-blue-500" />
            <h2 className="font-bold text-lg text-gray-800 tracking-wide">管理员账号</h2>
          </div>
          <form onSubmit={handlePasswordUpdate} className="p-8 space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                管理员用户名
              </label>
              <input
                type="text"
                value={settings.adminUsername}
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-100"
                disabled
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                当前密码
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                新密码
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                确认新密码
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={`px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-500 text-white rounded-xl font-bold shadow hover:scale-105 hover:shadow-xl transition-all flex items-center gap-2 ${
                isLoading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <Save size={20} />
              {isLoading ? '保存中...' : '更新密码'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;