import React from 'react';
import { NavLink } from 'react-router-dom';
import { Tooltip } from 'antd';
import { 
  Home, 
  Bot, 
  Key, 
  Activity, 
  Settings,
  MessageSquare,
  Puzzle,
  Brain,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Github,
  User,
  Users,
  Heart,
  BarChart3,
  Shield,
  Zap
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

interface NavItem {
  path: string;
  icon: React.ReactNode;
  text: string;
  badge?: string;
  children?: {
    path: string;
    text: string;
    icon?: React.ReactNode;
  }[];
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, setIsOpen }) => {
  const [expandedItems, setExpandedItems] = React.useState<string[]>(['/bots']);

  const toggleExpand = (path: string) => {
    setExpandedItems(prev => 
      prev.includes(path) 
        ? prev.filter(p => p !== path)
        : [...prev, path]
    );
  };

  const navItems: NavItem[] = [
    { 
      path: '/dashboard', 
      icon: <Home size={20} />, 
      text: '工作台',
      badge: 'NEW'
    },
    { 
      path: '/bots', 
      icon: <Bot size={20} />, 
      text: '机器人管理',
      children: [
        { path: '/bots/keyword-replies', text: '关键词回复', icon: <MessageSquare size={16} /> },
        { path: '/bots/plugins', text: '插件中心', icon: <Puzzle size={16} /> },
        { path: '/bots/ai-model', text: 'AI大模型', icon: <Brain size={16} /> },
        { path: '/bots/friends', text: '好友管理', icon: <Users size={16} /> },
        { path: '/bots/moments', text: '朋友圈管理', icon: <Heart size={16} /> },
      ]
    },
    { 
      path: '/auth-keys', 
      icon: <Key size={20} />, 
      text: '授权密钥',
      badge: 'PRO'
    },
    { 
      path: '/monitoring', 
      icon: <Activity size={20} />, 
      text: '监控状态' 
    },
    { 
      path: '/user-management', 
      icon: <User size={20} />, 
      text: '用户管理' 
    },
    { 
      path: '/settings', 
      icon: <Settings size={20} />, 
      text: '系统设置' 
    },
  ];

  const renderNavItem = (item: NavItem) => {
    const isExpanded = expandedItems.includes(item.path);
    const hasChildren = item.children && item.children.length > 0;

    return (
      <li key={item.path} className="mb-2">
        <div className="flex flex-col">
          <div
            className={`sidebar-item-enterprise ${hasChildren ? 'cursor-pointer' : ''}`}
            onClick={() => hasChildren ? toggleExpand(item.path) : null}
          >
            <Tooltip title={!isOpen ? item.text : undefined} placement="right">
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center flex-grow ${
                    isActive ? 'text-blue-400' : 'text-gray-300'
                  }`
                }
              >
                <span className="text-blue-400 flex-shrink-0">{item.icon}</span>
                <span className={`ml-3 font-medium ${!isOpen && 'md:hidden'}`}>
                  {item.text}
                </span>
                {item.badge && isOpen && (
                  <span className="ml-auto px-2 py-0.5 text-xs bg-blue-500 text-white rounded-full font-semibold">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            </Tooltip>
            {hasChildren && isOpen && (
              <span className="ml-auto text-gray-400 flex-shrink-0">
                {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </span>
            )}
          </div>

          {hasChildren && isExpanded && isOpen && item.children && (
            <div className="ml-4 mt-2 space-y-1">
              {item.children.map(child => (
                <Tooltip title={!isOpen ? child.text : undefined} placement="right" key={child.path}>
                  <NavLink
                    to={child.path}
                    className={({ isActive }) => 
                      `flex items-center p-3 rounded-xl text-sm transition-all duration-200 mx-2
                      ${isActive 
                        ? 'text-blue-400 bg-blue-900/30 border-l-2 border-blue-400' 
                        : 'text-gray-400 hover:bg-gray-700 hover:text-white'
                      }`
                    }
                  >
                    {child.icon && (
                      <span className="mr-3 flex-shrink-0">
                        {child.icon}
                      </span>
                    )}
                    <span className={`font-medium ${!isOpen && 'md:hidden'}`}>{child.text}</span>
                  </NavLink>
                </Tooltip>
              ))}
            </div>
          )}
        </div>
      </li>
    );
  };

  return (
    <aside className={`sidebar-enterprise h-screen fixed top-0 left-0 pt-20 transition-all duration-300 z-20 flex flex-col justify-between
      ${isOpen ? 'w-64' : 'w-0 md:w-16'}`}
    >
      <div className="flex-1 flex flex-col">
        {/* 导航菜单 */}
        <div className="py-6 overflow-y-auto flex-1 hide-scrollbar">
          <nav className={`px-3 ${!isOpen && 'md:flex md:flex-col md:items-center'}`}>
            <ul className="space-y-1">
              {navItems.map(renderNavItem)}
            </ul>
          </nav>
        </div>

        {/* 快捷操作区 */}
        {isOpen && (
          <div className="px-4 py-4 border-t border-gray-700">
            <div className="space-y-2">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                快捷操作
              </div>
              <button className="w-full flex items-center px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white rounded-lg transition-all duration-200">
                <BarChart3 size={16} className="mr-3" />
                数据统计
              </button>
              <button className="w-full flex items-center px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white rounded-lg transition-all duration-200">
                <Shield size={16} className="mr-3" />
                安全中心
              </button>
              <button className="w-full flex items-center px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white rounded-lg transition-all duration-200">
                <Zap size={16} className="mr-3" />
                性能优化
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 底部区域 */}
      <div className="px-4 pb-6">
        {/* 折叠按钮 */}
        <button
          className="w-full mb-4 p-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl transition-all duration-200 flex items-center justify-center"
          onClick={() => setIsOpen(!isOpen)}
          title={isOpen ? '收起导航栏' : '展开导航栏'}
        >
          {isOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
        </button>

        {/* 项目信息 */}
        <div className="text-center">
          <a
            href="https://github.com/kilimro/bot_web"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center space-x-2 text-gray-400 hover:text-blue-400 transition-colors duration-200"
          >
            <Github size={isOpen ? 18 : 20} />
            {isOpen && <span className="text-sm font-medium">开源项目</span>}
          </a>
          {isOpen && (
            <div className="mt-2 space-y-1">
              <div className="text-xs text-gray-500">
                © 2024 BOT管理平台
              </div>
              <div className="text-xs text-gray-600">
                Enterprise Edition v2.0
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;