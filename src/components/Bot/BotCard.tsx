import React from 'react';
import { Bot as BotIcon, Wifi, WifiOff, Clock, User, Trash2, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Bot } from '../../types';

interface BotCardProps {
  bot: Bot;
  onLogin: (botId: string) => void;
  onDelete: (botId: string) => void;
  onLogout: (botId: string) => void;
  onRefresh: (botId: string) => void;
}

const BotCard: React.FC<BotCardProps> = ({ bot, onLogin, onDelete, onLogout, onRefresh }) => {
  const navigate = useNavigate();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'text-green-500';
      case 'offline':
        return 'text-red-500';
      case 'authenticating':
        return 'text-yellow-500';
      default:
        return 'text-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online':
        return <Wifi className="text-green-500" size={18} />;
      case 'offline':
        return <WifiOff className="text-red-500" size={18} />;
      case 'authenticating':
        return <Clock className="text-yellow-500" size={18} />;
      default:
        return <BotIcon className="text-gray-500" size={18} />;
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '未知';
    return new Date(dateString).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleViewDetails = () => {
    navigate(`/bots/${bot.id}`);
  };

  const handleDelete = () => {
    if (window.confirm('确定要删除这个机器人吗？此操作无法撤销。')) {
      onDelete(bot.id);
    }
  };

  return (
    <div
      className="bg-gradient-to-br from-blue-50 via-white to-white rounded-2xl shadow-lg border border-gray-100 group relative overflow-hidden min-h-[260px] p-5 flex flex-col justify-between transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:border-blue-400 hover:z-10 hover:bg-gradient-to-br hover:from-blue-100 hover:via-white hover:to-white"
      style={{ boxShadow: '0 4px 24px 0 rgba(60,120,240,0.06)' }}
    >
      {/* 顶部信息区 */}
      <div className="flex items-center mb-2">
        <div className="bg-blue-200 text-blue-700 rounded-full p-3 mr-3 shadow-sm group-hover:bg-blue-400 group-hover:text-white transition-colors duration-300">
          <BotIcon size={28} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-bold text-gray-900 group-hover:text-blue-800 transition-colors duration-300 truncate">
            {bot.nickname || `机器人 ${bot.id.slice(0, 8)}`}
          </h3>
          <p className="text-xs text-gray-400 mt-0.5 truncate">{bot.wxid ? `ID: ${bot.wxid}` : `ID: ${bot.id.slice(0, 8)}`}</p>
        </div>
        <span className={`ml-2 px-2 py-0.5 text-xs rounded-full font-medium ${
          bot.status === 'online'
            ? 'bg-green-100 text-green-700'
            : bot.status === 'authenticating'
            ? 'bg-yellow-100 text-yellow-700'
            : 'bg-gray-200 text-gray-500'
        }`}>
          {bot.status === 'online' ? '在线' : bot.status === 'authenticating' ? '验证中' : '离线'}
        </span>
      </div>

      {/* 头像区 */}
      {bot.avatar_url && (
        <div className="mb-4 flex justify-center">
          <img
            src={bot.avatar_url}
            alt={bot.nickname || '机器人头像'}
            className="w-20 h-20 rounded-full border-2 border-blue-100 shadow"
          />
        </div>
      )}

      {/* 信息区 */}
      <div className="space-y-2 text-sm mb-2">
        <div className="flex items-center text-gray-600">
          <span className="font-medium w-20 text-gray-500">授权密钥:</span>
          <span className="break-all text-gray-800">{bot.auth_key || '未设置'}</span>
        </div>
        <div className="flex items-center text-gray-600">
          <Clock size={16} className="mr-1 text-blue-400" />
          <span className="font-medium mr-2 text-gray-500">创建时间:</span>
          <span className="text-gray-800">{formatDate(bot.created_at)}</span>
        </div>
        {bot.last_active_at && (
          <div className="flex items-center text-gray-600">
            <Clock size={16} className="mr-1 text-blue-400" />
            <span className="font-medium mr-2 text-gray-500">最后活动:</span>
            <span className="text-gray-800">{formatDate(bot.last_active_at)}</span>
          </div>
        )}
      </div>

      {/* 底部操作区 */}
      <div className="flex space-x-2 mt-auto">
        {bot.status === 'offline' ? (
          <button
            onClick={() => onLogin(bot.id)}
            className="flex-1 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 text-sm font-semibold shadow"
          >
            登录机器人
          </button>
        ) : (
          <>
            <button
              onClick={handleViewDetails}
              className="flex-1 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 text-sm font-semibold shadow"
            >
              查看详情
            </button>
            <button
              className="flex-1 py-2 px-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50 text-sm font-semibold shadow"
              onClick={() => bot.status === 'online' ? onLogout(bot.id) : undefined}
            >
              {bot.status === 'online' ? '下线' : '取消'}
            </button>
          </>
        )}
        <button
          onClick={() => onRefresh(bot.id)}
          className="p-2 rounded-lg hover:bg-blue-200 text-blue-600 hover:text-blue-900 transition-all duration-200 hover:scale-110"
          title="刷新在线状态"
        >
          <RefreshCw size={18} />
        </button>
        <button
          onClick={handleDelete}
          className="p-2 rounded-lg hover:bg-red-200 text-red-500 hover:text-red-700 transition-all duration-200 hover:scale-110"
          title="删除机器人"
        >
          <Trash2 size={18} />
        </button>
      </div>
    </div>
  );
};

export default BotCard;