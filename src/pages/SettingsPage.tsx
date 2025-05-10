import React, { useState, useEffect } from 'react';
import { Save, AlertTriangle } from 'lucide-react';
import { updateAdminPassword } from '../services/api';

interface SystemSettings {
  systemName: string;
  apiBaseUrl: string;
  wsBaseUrl: string;
  adminUsername: string;
}

const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<SystemSettings>({
    systemName: 'bot机器人管理平台',
    apiBaseUrl: 'https://kimi.920pdd.com',
    wsBaseUrl: 'wss://kimi.920pdd.com/ws',
    adminUsername: 'admin',
  });

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const [showError, setShowError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

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
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">系统设置</h1>
        <p className="text-gray-600">配置系统基本参数和功能</p>
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

      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <h2 className="font-bold text-gray-800">基本设置</h2>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                系统名称
              </label>
              <input
                type="text"
                value={settings.systemName}
                onChange={(e) => setSettings({ ...settings, systemName: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                API基础地址
              </label>
              <input
                type="text"
                value={settings.apiBaseUrl}
                onChange={(e) => setSettings({ ...settings, apiBaseUrl: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                WebSocket地址
              </label>
              <input
                type="text"
                value={settings.wsBaseUrl}
                onChange={(e) => setSettings({ ...settings, wsBaseUrl: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <h2 className="font-bold text-gray-800">管理员账号</h2>
          </div>
          <form onSubmit={handlePasswordUpdate} className="p-6 space-y-4">
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
              className={`px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center ${
                isLoading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <Save size={18} className="mr-2" />
              {isLoading ? '保存中...' : '更新密码'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;