import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LogIn, UserPlus, Eye, EyeOff, Mail, Lock, Shield } from 'lucide-react';
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
    setShowPassword(false);
    setShowConfirmPassword(false);
    generateCaptcha();
  };

  // 切换模式
  const toggleMode = () => {
    setError('');
    setSuccess('');
    setIsRegisterMode(!isRegisterMode);
    // 保留邮箱，清空密码
    setPassword('');
    setConfirmPassword('');
    setCaptchaInput('');
    generateCaptcha();
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

      // 使用Supabase注册
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
          data: {
            email: email,
            created_at: new Date().toISOString()
          }
        }
      });

      if (error) {
        console.error('Supabase registration error:', error);
        throw error;
      }

      if (data.user) {
        // 检查是否需要邮箱验证
        if (data.user.email_confirmed_at) {
          // 邮箱已确认，直接登录
          setSuccess('注册成功！正在为您登录...');
          setTimeout(async () => {
            try {
              await login(email, password);
              navigate('/dashboard');
            } catch (loginError) {
              console.error('Auto login error:', loginError);
              setError('注册成功但自动登录失败，请手动登录');
              setIsRegisterMode(false);
            }
          }, 1500);
        } else {
          // 需要邮箱验证
          setSuccess('注册成功！请检查您的邮箱并点击验证链接完成注册。');
          setTimeout(() => {
            setIsRegisterMode(false);
            setPassword('');
            setConfirmPassword('');
          }, 3000);
        }
      }
    } catch (err: any) {
      console.error('Registration error:', err);
      
      // 处理各种错误情况
      if (err.message?.includes('User already registered')) {
        setError('该邮箱已被注册，请直接登录');
        setTimeout(() => {
          setIsRegisterMode(false);
          setPassword('');
          setConfirmPassword('');
        }, 2000);
      } else if (err.message?.includes('Invalid email')) {
        setError('邮箱格式不正确，请检查后重试');
      } else if (err.message?.includes('Password should be at least')) {
        setError('密码长度至少6位');
      } else if (err.message?.includes('signup is disabled')) {
        setError('注册功能暂时关闭，请联系管理员');
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
      {/* 顶部切换按钮 */}
      <div className="mb-6">
        <div className="relative flex bg-gray-100 rounded-xl p-1">
          {/* 滑动背景 */}
          <div 
            className={`absolute top-1 bottom-1 w-1/2 bg-white rounded-lg shadow-sm transition-transform duration-300 ease-out ${
              isRegisterMode ? 'translate-x-full' : 'translate-x-0'
            }`}
          />
          
          {/* 登录按钮 */}
          <button
            type="button"
            onClick={() => isRegisterMode && toggleMode()}
            className={`relative z-10 flex-1 py-3 text-center text-sm font-semibold transition-colors duration-300 ${
              !isRegisterMode 
                ? 'text-blue-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            登录账号
          </button>
          
          {/* 注册按钮 */}
          <button
            type="button"
            onClick={() => !isRegisterMode && toggleMode()}
            className={`relative z-10 flex-1 py-3 text-center text-sm font-semibold transition-colors duration-300 ${
              isRegisterMode 
                ? 'text-blue-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            注册账号
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* 邮箱输入框 */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Mail size={18} className="text-gray-400" />
          </div>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-900 placeholder-gray-500"
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
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-900 placeholder-gray-500"
            placeholder={isRegisterMode ? "请设置密码（至少6位）" : "请输入密码"}
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
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
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-900 placeholder-gray-500"
              placeholder="请再次输入密码"
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
            >
              {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        )}

        {/* 验证码输入框 */}
        <div className="flex gap-3">
          <input
            type="text"
            value={captchaInput}
            onChange={(e) => setCaptchaInput(e.target.value)}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-900 placeholder-gray-500"
            placeholder="请输入验证码"
            maxLength={4}
            required
          />
          <div 
            className="px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 font-mono text-lg tracking-widest select-none cursor-pointer hover:bg-blue-100 transition-colors min-w-[80px] text-center" 
            onClick={generateCaptcha} 
            title="点击刷新验证码"
          >
            {captcha}
          </div>
        </div>

        {/* 协议勾选 */}
        <div className="flex items-start">
          <input 
            type="checkbox" 
            checked={checked} 
            onChange={e => setChecked(e.target.checked)} 
            className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" 
          />
          <label className="ml-2 text-sm text-gray-600 leading-relaxed">
            我已阅读并同意
            <span className="text-blue-600 hover:text-blue-800 cursor-pointer mx-1" onClick={() => setShowAgreement(true)}>《服务协议》</span>
            和
            <span className="text-blue-600 hover:text-blue-800 cursor-pointer ml-1" onClick={() => setShowAgreement(true)}>《隐私政策》</span>
          </label>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* 成功提示 */}
        {success && (
          <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
            {success}
          </div>
        )}

        {/* 提交按钮 */}
        <button
          type="submit"
          disabled={loading}
          className={`w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center ${loading ? 'opacity-70 cursor-not-allowed' : 'hover:shadow-lg'}`}
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
      </form>

      {/* 协议弹窗 */}
      <Modal 
        open={showAgreement} 
        onCancel={() => setShowAgreement(false)} 
        footer={null} 
        title="服务协议与隐私政策"
        width={600}
      >
        <div className="max-h-96 overflow-y-auto p-4 text-gray-700 text-sm">
          <h3 className="font-bold mb-3 text-gray-900">服务协议</h3>
          <p className="mb-4 leading-relaxed">
            本项目 <a href="https://github.com/kilimro/bot_web" target="_blank" className="text-blue-600 underline">kilimro/bot_web</a> 为开源项目，仅供学习与技术交流使用。<br/>
            严禁将本项目用于任何商业用途，包括但不限于以本项目为基础进行产品开发、销售、运营等。<br/>
            如因违反本协议造成的任何法律责任，均由使用者自行承担，项目作者不承担任何责任。<br/>
            如需商用或二次开发，请联系作者并获得书面授权。
          </p>
          <h3 className="font-bold mt-6 mb-3 text-gray-900">隐私政策</h3>
          <p className="leading-relaxed">
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