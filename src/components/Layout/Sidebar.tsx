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
  Dot,
  User
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

interface NavItem {
  path: string;
  icon: React.ReactNode;
  text: string;
  children?: {
    path: string;
    text: string;
  }[];
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, setIsOpen }) => {
  const [expandedItems, setExpandedItems] = React.useState<string[]>([]);

  const toggleExpand = (path: string) => {
    setExpandedItems(prev => 
      prev.includes(path) 
        ? prev.filter(p => p !== path)
        : [...prev, path]
    );
  };

  const navItems: NavItem[] = [
    { path: '/dashboard', icon: <Home size={20} />, text: '工作台' },
    { 
      path: '/bots', 
      icon: <Bot size={20} />, 
      text: '机器人管理',
      children: [
        { path: '/bots/keyword-replies', text: '关键词回复' },
        { path: '/bots/plugins', text: '插件中心' },
        { path: '/bots/ai-model', text: 'AI大模型' },
        { path: '/bots/friends', text: '好友管理' },
        { path: '/bots/moments', text: '朋友圈管理' },
      ]
    },
    { path: '/auth-keys', icon: <Key size={20} />, text: '授权密钥' },
    { path: '/monitoring', icon: <Activity size={20} />, text: '监控状态' },
    { path: '/settings', icon: <Settings size={20} />, text: '系统设置' },
    { path: '/user-management', icon: <User size={20} />, text: '用户管理' },
  ];

  const renderNavItem = (item: NavItem) => {
    const isExpanded = expandedItems.includes(item.path);
    const hasChildren = item.children && item.children.length > 0;

    return (
      <li key={item.path} className="mb-1">
        <div className="flex flex-col">
          <div
            className={`flex items-center p-3 ${isOpen ? 'pl-4' : 'md:justify-center'} rounded-lg 
              text-gray-300 hover:bg-gray-800 transition-colors cursor-pointer`}
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
                <span className="text-blue-400">{item.icon}</span>
                <span className={`ml-3 ${!isOpen && 'md:hidden'}`}>
                  {item.text}
                </span>
              </NavLink>
            </Tooltip>
            {hasChildren && isOpen && (
              <span className="ml-auto">
                {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </span>
            )}
          </div>

          {hasChildren && isExpanded && isOpen && item.children && (
            <div className="ml-8 mt-1">
              {item.children.map(child => (
                <Tooltip title={!isOpen ? child.text : undefined} placement="right" key={child.path}>
                  <NavLink
                    to={child.path}
                    className={({ isActive }) => 
                      `flex items-center p-2 rounded-lg text-sm
                      ${isActive ? 'text-blue-400 bg-gray-800' : 'text-gray-400 hover:bg-gray-800'} 
                      transition-colors`
                    }
                  >
                    <span className="mr-2 flex items-center">
                      <Dot size={18} className="text-blue-400" />
                    </span>
                    <span className={`${!isOpen && 'md:hidden'}`}>{child.text}</span>
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
    <aside className={`bg-gray-900 text-white h-screen fixed top-0 left-0 pt-16 transition-all duration-300 z-10 flex flex-col justify-between
      ${isOpen ? 'w-64' : 'w-0 md:w-16'}`}
    >
      <div className="flex-1 flex flex-col">
        <div className="py-4 overflow-y-auto h-full">
          <nav className={`${!isOpen && 'md:flex md:flex-col md:items-center'}`}>
            <ul>
              {navItems.map(renderNavItem)}
            </ul>
          </nav>
        </div>
      </div>
      {/* 底部文案区 */}
      <div className="px-2 pb-4 text-xs text-gray-400 flex flex-col items-center">
        {/* 缩放按钮放在底部文案区最上方 */}
        <button
          className="bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-full p-1 mb-2 transition-all"
          onClick={() => setIsOpen(!isOpen)}
          title={isOpen ? '收起导航栏' : '展开导航栏'}
        >
          {isOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
        </button>
        <a
          href="https://github.com/kilimro/bot_web"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 hover:text-blue-400"
        >
          <Github size={isOpen ? 18 : 20} />
          {isOpen && <span>bot_web 开源地址</span>}
        </a>
        <div className="mt-1 text-[11px] text-gray-500 text-center">
          {isOpen ? '© 2024 bot_web | MIT License' : '©'}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;