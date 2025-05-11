import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import { useAuth } from '../../context/AuthContext';

const MainLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  return (
    <div className="min-h-screen bg-gray-100">
      <Header />
      
      <div className="flex">
        <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
        
        <main className={`transition-all duration-300 flex-grow bg-gradient-to-br from-blue-50 via-white to-purple-50 min-h-screen pt-16 ${
          sidebarOpen ? 'md:ml-64' : 'md:ml-16'
        }`}>
          <div className="p-4 md:p-6 pb-14">
            <Outlet />
          </div>
          {/* footer已移除，不再显示全局底部 */}
        </main>
      </div>
    </div>
  );
};

export default MainLayout;