import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { LogOut, User, Bot, Bell, Settings, Search } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const getPageTitle = () => {
    const path = location.pathname;
    if (path.startsWith('/bots/keyword-replies')) return '关键词回复';
    if (path.startsWith('/bots/plugins')) return '插件中心';
    if (path.startsWith('/bots/ai-model')) return 'AI大模型';
    if (path.startsWith('/bots/friends')) return '好友管理';
    if (path.startsWith('/bots/moments')) return '朋友圈管理';
    if (path.startsWith('/bots')) return '机器人管理';
    if (path === '/dashboard') return '工作台';
    if (path === '/auth-keys') return '授权密钥';
    if (path === '/monitoring') return '监控状态';
    if (path === '/settings') return '系统设置';
    if (path === '/user-management') return '用户管理';
    return '';
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="nav-enterprise fixed top-0 left-0 right-0 z-30 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* 左侧品牌区域 */}
        <div className="flex items-center space-x-6">
          <Link to="/dashboard" className="flex items-center space-x-3 group">
            <div className="relative">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300">
                <Bot size={24} className="text-white" />
              </div>
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white animate-pulse"></div>
            </div>
            <div className="hidden md:block">
              <h1 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                BOT管理平台
              </h1>
              <p className="text-xs text-gray-500 -mt-1">Enterprise Edition</p>
            </div>
          </Link>
          
          {/* 面包屑导航 */}
          {getPageTitle() && (
            <div className="hidden lg:flex items-center space-x-2 text-sm">
              <span className="text-gray-400">/</span>
              <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-lg font-medium">
                {getPageTitle()}
              </span>
            </div>
          )}
        </div>

        {/* 中间搜索区域 */}
        <div className="hidden md:flex flex-1 max-w-md mx-8">
          <div className="search-enterprise w-full">
            <Search className="search-icon-enterprise" size={20} />
            <input
              type="text"
              placeholder="搜索功能、机器人或设置..."
              className="search-input-enterprise"
            />
          </div>
        </div>
        
        {/* 右侧操作区域 */}
        <div className="flex items-center space-x-4">
          {/* 通知中心 */}
          <button className="relative p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all duration-200">
            <Bell size={20} />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
          </button>

          {/* GitHub链接 */}
          <a
            href="https://github.com/kilimro/bot_web"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden md:flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all duration-200"
            title="GitHub 开源仓库"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
            <span className="text-sm font-medium">GitHub</span>
          </a>

          {/* 用户菜单 */}
          {user && (
            <div className="flex items-center space-x-3">
              <div className="hidden md:flex flex-col items-end">
                <span className="text-sm font-semibold text-gray-900">{user.email}</span>
                <span className="text-xs text-gray-500">管理员</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center text-white font-semibold shadow-lg">
                  {user.email.charAt(0).toUpperCase()}
                </div>
                
                <div className="flex flex-col space-y-1">
                  <Link
                    to="/settings"
                    className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
                    title="系统设置"
                  >
                    <Settings size={16} />
                  </Link>
                  
                  <button
                    onClick={handleLogout}
                    className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                    title="退出登录"
                  >
                    <LogOut size={16} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;