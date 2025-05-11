import React from 'react';
import { Navigate } from 'react-router-dom';
import LoginForm from '../components/Auth/LoginForm';
import { useAuth } from '../context/AuthContext';

const LoginPage: React.FC = () => {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen w-full flex flex-col justify-between items-center bg-cover bg-center" style={{ backgroundImage: 'url(/img/background.png)' }}>
      <div className="flex flex-1 w-full justify-center items-center">
        <div className="flex w-full max-w-3xl min-h-[480px] shadow-2xl rounded-3xl overflow-hidden bg-white bg-opacity-80 backdrop-blur-lg">
          {/* 左侧图片区 */}
          <div className="hidden md:block w-1/2 bg-cover bg-center" style={{ backgroundImage: 'url(/img/bgn.jpg)' }} />
          {/* 右侧表单区 */}
          <div className="w-full md:w-1/2 flex flex-col justify-center items-center p-8">
            <div className="w-full">
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-blue-700 mb-2">BOT管理平台</h1>
                <p className="text-blue-400">所见·即所得</p>
              </div>
              <LoginForm />
            </div>
          </div>
        </div>
      </div>
      {/* 底部信息 */}
      <div className="w-full text-center py-4 text-gray-500 text-sm flex flex-col items-center gap-1">
        <a href="https://github.com/kilimro/bot_web" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-blue-500 hover:underline">
          <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M12 .5C5.73.5.5 5.73.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56 0-.28-.01-1.02-.02-2-3.2.7-3.88-1.54-3.88-1.54-.53-1.34-1.3-1.7-1.3-1.7-1.06-.72.08-.71.08-.71 1.17.08 1.79 1.2 1.79 1.2 1.04 1.78 2.73 1.27 3.4.97.11-.75.41-1.27.74-1.56-2.55-.29-5.23-1.28-5.23-5.7 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11.1 11.1 0 0 1 2.9-.39c.98 0 1.97.13 2.9.39 2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.43-2.69 5.41-5.25 5.7.42.36.79 1.09.79 2.2 0 1.59-.01 2.87-.01 3.26 0 .31.21.68.8.56C20.71 21.39 24 17.08 24 12c0-6.27-5.23-11.5-12-11.5z"/></svg>
          GitHub
        </a>
        <span>© 2024 bot管理平台. 保留所有权利.</span>
      </div>
    </div>
  );
};

export default LoginPage;