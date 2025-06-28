import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LogIn, UserPlus, Eye, EyeOff, Mail, Lock, User, Shield } from 'lucide-react';
import { Modal } from 'antd';
import { supabase } from '../../lib/supabase';

const LoginForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  // 验证码相关
  const [captcha, setCaptcha] = useState('');
  const [captchaInput, setCaptchaInput] = useState('');
  const [showAgreement, setShowAgreement] = useState(false);
  const [checked, setChecked] = useState(false);

  // 生成4位数字验证码
  const generateCaptcha = () => {
    const code = Math.random().toString().slice(2, 6);
    setCaptcha(code);
  };
  React.useEffect(() => { generateCaptcha(); }, []);

  // 重置表单
  const resetForm = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setCaptchaInput('');
    setError('');
    setSuccess('');
    generateCaptcha();
  };

  // 切换模式
  const toggleMode = () => {
    setIsRegisterMode(!isRegisterMode);
    resetForm();
  };

  // 注册处理
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password || !confirmPassword) {
      setError('请填写所有必填字段');
      return;
    }

    if (password !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    if (password.length < 6) {
      setError('密码长度至少6位');
      return;
    }

    if (!captchaInput || captchaInput !== captcha) {
      setError('验证码错误');
      generateCaptcha();
      return;
    }

    if (!checked) {
      setError('请先同意服务协议和隐私政策');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccess('');

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`
        }
      });

      if (error) throw error;

      if (data.user) {
        setSuccess('注册成功！正在为您登录...');
        // 注册成功后自动登录
        setTimeout(async () => {
          try {
            await login(email, password);
            navigate('/dashboard');
          } catch (loginError) {
            setError('注册成功但自动登录失败，请手动登录');
            setIsRegisterMode(false);
          }
        }, 1500);
      }
    } catch (err: any) {
      console.error('Registration error:', err);
      if (err.message?.includes('already registered')) {
        setError('该邮箱已被注册，请直接登录');
      } else {
        setError(err.message || '注册失败，请稍后重试');
      }
    } finally {
      setLoading(false);
    }
  };

  // 登录处理
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('请输入邮箱和密码');
      return;
    }
    if (!captchaInput || captchaInput !== captcha) {
      setError('验证码错误');
      generateCaptcha();
      return;
    }
    if (!checked) {
      setError('请先同意服务协议和隐私政策');
      return;
    }
    try {
      setLoading(true);
      setError('');
      setSuccess('');
      await login(email, password);
      setSuccess('登录成功！正在跳转...');
      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '登录失败，请检查邮箱和密码';
      setError(errorMessage);
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = isRegisterMode ? handleRegister : handleLogin;

  return (
    <>
      <div className="mb-4 text-center">
        <div className="flex justify-center space-x-1 bg-gray-100 rounded-lg p-1">
          <button
            type="button"
            onClick={() => !isRegisterMode && toggleMode()}
            className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all duration-200 ${
              !isRegisterMode 
                ? 'bg-white text-blue-600 shadow-sm' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            登录
          </button>
          <button
            type="button"
            onClick={() => isRegisterMode && toggleMode()}
            className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all duration-200 ${
              isRegisterMode 
                ? 'bg-white text-blue-600 shadow-sm' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            注册
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 邮箱输入框 */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Mail size={18} className="text-gray-400" />
          </div>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 text-gray-800 bg-white placeholder-gray-400 text-sm shadow-sm hover:border-gray-300"
            placeholder="请输入邮箱地址"
            required
          />
        </div>

        {/* 密码输入框 */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Lock size={18} className="text-gray-400" />
          </div>
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 text-gray-800 bg-white placeholder-gray-400 text-sm shadow-sm hover:border-gray-300"
            placeholder={isRegisterMode ? "请设置密码（至少6位）" : "请输入密码"}
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        {/* 确认密码输入框（仅注册模式显示） */}
        {isRegisterMode && (
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Shield size={18} className="text-gray-400" />
            </div>
            <input
              id="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 text-gray-800 bg-white placeholder-gray-400 text-sm shadow-sm hover:border-gray-300"
              placeholder="请再次输入密码"
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
            >
              {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        )}

        {/* 验证码输入框 */}
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <User size={18} className="text-gray-400" />
            </div>
            <input
              id="captcha"
              type="text"
              value={captchaInput}
              onChange={(e) => setCaptchaInput(e.target.value)}
              className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 text-gray-800 bg-white placeholder-gray-400 text-sm shadow-sm hover:border-gray-300"
              placeholder="请输入验证码"
              maxLength={4}
              inputMode="numeric"
              required
            />
          </div>
          <div 
            className="px-4 py-2.5 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 text-blue-700 font-mono text-base tracking-widest select-none cursor-pointer hover:from-blue-100 hover:to-indigo-100 transition-all duration-200 shadow-sm hover:shadow-md" 
            onClick={generateCaptcha} 
            title="点击刷新验证码"
          >
            {captcha}
          </div>
        </div>

        {/* 协议勾选 */}
        <div className="flex items-center justify-between">
          <label className="flex items-center text-xs cursor-pointer">
            <input 
              type="checkbox" 
              checked={checked} 
              onChange={e => setChecked(e.target.checked)} 
              className="mr-2 w-3.5 h-3.5 text-blue-600 border border-gray-300 rounded focus:ring-blue-500 focus:ring-1" 
            />
            <span className="text-gray-600">我已阅读并同意</span>
            <span className="text-blue-600 hover:text-blue-800 cursor-pointer ml-1 font-medium" onClick={() => setShowAgreement(true)}>服务协议</span>
            <span className="text-gray-600 mx-1">和</span>
            <span className="text-blue-600 hover:text-blue-800 cursor-pointer font-medium" onClick={() => setShowAgreement(true)}>隐私政策</span>
          </label>
        </div>

        {/* 错误和成功提示 */}
        {error && (
          <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs flex items-center shadow-sm">
            <div className="w-1.5 h-1.5 bg-red-500 rounded-full mr-2 flex-shrink-0"></div>
            {error}
          </div>
        )}
        {success && (
          <div className="p-2.5 bg-green-50 border border-green-200 text-green-700 rounded-lg text-xs flex items-center shadow-sm">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-2 flex-shrink-0"></div>
            {success}
          </div>
        )}

        {/* 提交按钮 */}
        <button
          type="submit"
          disabled={loading}
          className={`w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-2.5 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 flex items-center justify-center transition-all duration-200 hover:scale-[1.01] shadow-md hover:shadow-lg text-sm ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
        >
          {loading ? (
            <span className="flex items-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {isRegisterMode ? '注册中...' : '登录中...'}
            </span>
          ) : (
            <span className="flex items-center">
              {isRegisterMode ? (
                <>
                  <UserPlus size={18} className="mr-2" />
                  立即注册
                </>
              ) : (
                <>
                  <LogIn size={18} className="mr-2" />
                  立即登录
                </>
              )}
            </span>
          )}
        </button>

        {/* 切换模式提示 */}
        <div className="text-center pt-3">
          <span className="text-gray-500 text-xs">
            {isRegisterMode ? '已有账号？' : '还没有账号？'}
          </span>
          <button
            type="button"
            onClick={toggleMode}
            className="ml-1 text-blue-600 hover:text-blue-800 font-medium text-xs transition-colors"
          >
            {isRegisterMode ? '立即登录' : '立即注册'}
          </button>
        </div>
      </form>

      {/* 协议弹窗 */}
      <Modal 
        open={showAgreement} 
        onCancel={() => setShowAgreement(false)} 
        footer={null} 
        title="服务协议与隐私政策"
        width={600}
      >
        <div className="max-h-96 overflow-y-auto p-2 text-gray-700 text-sm">
          <h3 className="font-bold mb-2">服务协议</h3>
          <p className="mb-4">
            本项目 <a href="https://github.com/kilimro/bot_web" target="_blank" className="text-blue-600 underline">kilimro/bot_web</a> 为开源项目，仅供学习与技术交流使用。<br/>
            严禁将本项目用于任何商业用途，包括但不限于以本项目为基础进行产品开发、销售、运营等。<br/>
            如因违反本协议造成的任何法律责任，均由使用者自行承担，项目作者不承担任何责任。<br/>
            如需商用或二次开发，请联系作者并获得书面授权。
          </p>
          <h3 className="font-bold mt-4 mb-2">隐私政策</h3>
          <p>
            本项目本身不收集、存储或上传任何用户的个人信息。<br/>
            如因自行部署或二次开发涉及用户数据采集、存储、传输等行为，请严格遵守相关法律法规，并自行承担相应责任。<br/>
            项目作者不对任何第三方使用本项目产生的数据安全或隐私问题负责。
          </p>
        </div>
      </Modal>
    </>
  );
};

export default LoginForm;