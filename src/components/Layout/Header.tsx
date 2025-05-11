import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { LogOut, User, Menu, Bot, FileText } from 'lucide-react';
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
    return '';
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
      <header className="bg-gradient-to-r from-blue-900 to-gray-900 text-white p-2 shadow-md flex justify-between items-center fixed top-0 left-0 right-0 z-20">
        <div className="flex items-center flex-shrink-0 min-w-0">
          <Link to="/dashboard" className="text-xl font-bold flex items-center">
            <Bot size={24} className="text-blue-300 mr-2" />
            <span className="text-blue-300">NEW</span>
            <span className="ml-1">BOT管理平台</span>
          </Link>
          {getPageTitle() && (
            <span className="flex items-center ml-4 text-lg font-medium text-white whitespace-nowrap">
              <span className="mx-2 text-gray-400">/</span>
              {getPageTitle()}
            </span>
          )}
        </div>
        
        <div className="flex items-center space-x-4 flex-shrink-0">
          <a
            href="https://github.com/kilimro/bot_web"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded hover:bg-blue-800 transition-colors flex items-center text-blue-200 hover:text-white"
            title="GitHub 开源仓库"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2C6.477 2 2 6.484 2 12.021c0 4.428 2.865 8.184 6.839 9.504.5.092.682-.217.682-.483 0-.237-.009-.868-.014-1.703-2.782.605-3.369-1.342-3.369-1.342-.454-1.155-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.004.07 1.532 1.032 1.532 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.339-2.221-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.987 1.029-2.686-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.025A9.564 9.564 0 0 1 12 6.844c.85.004 1.705.115 2.504.337 1.909-1.295 2.748-1.025 2.748-1.025.546 1.378.202 2.397.1 2.65.64.699 1.028 1.593 1.028 2.686 0 3.847-2.337 4.695-4.566 4.944.359.309.678.919.678 1.852 0 1.336-.012 2.417-.012 2.747 0 .268.18.579.688.481C19.138 20.2 22 16.447 22 12.021 22 6.484 17.523 2 12 2z" fill="currentColor"></path></svg>
          </a>
          
          {user && (
            <div className="flex items-center">
              <div className="hidden md:flex items-center mr-4">
                <User size={18} className="mr-2 text-blue-300" />
                <span>{user.email}</span>
              </div>
              <button 
                onClick={handleLogout}
                className="p-2 rounded hover:bg-blue-800 transition-colors flex items-center"
              >
                <LogOut size={18} />
                <span className="ml-1 hidden md:inline">退出</span>
              </button>
            </div>
          )}
        </div>
      </header>
    </>
  );
};

export default Header;