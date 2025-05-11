import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LogIn } from 'lucide-react';
import { Modal } from 'antd';

const LoginForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
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

  const handleSubmit = async (e: React.FormEvent) => {
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

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-800 bg-white bg-opacity-90 placeholder-gray-400 text-base shadow-sm"
            placeholder="请输入邮箱"
            required
          />
        </div>
        <div>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-800 bg-white bg-opacity-90 placeholder-gray-400 text-base shadow-sm"
            placeholder="请输入密码"
            required
          />
        </div>
        <div className="flex items-center gap-2">
          <input
            id="captcha"
            type="text"
            value={captchaInput}
            onChange={(e) => setCaptchaInput(e.target.value)}
            className="flex-1 px-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-800 bg-white bg-opacity-90 placeholder-gray-400 text-base shadow-sm"
            placeholder="请输入验证码"
            maxLength={4}
            inputMode="numeric"
            required
          />
          <span className="inline-block px-4 py-2 rounded-lg bg-blue-50 text-blue-700 font-mono text-lg tracking-widest select-none cursor-pointer border border-blue-200 shadow-sm" onClick={generateCaptcha} title="点击刷新验证码">{captcha}</span>
        </div>
        <div className="flex items-center justify-between">
          <label className="flex items-center text-sm">
            <input type="checkbox" checked={checked} onChange={e => setChecked(e.target.checked)} className="mr-2" />
            我已阅读并同意
            <span className="text-blue-600 cursor-pointer ml-1" onClick={() => setShowAgreement(true)}>服务协议</span>
            和
            <span className="text-blue-600 cursor-pointer ml-1" onClick={() => setShowAgreement(true)}>隐私政策</span>
          </label>
        </div>
        {error && (
          <div className="p-2 bg-red-100 text-red-600 rounded text-sm flex items-center">{error}</div>
        )}
        {success && (
          <div className="p-2 bg-green-100 text-green-600 rounded text-sm flex items-center">{success}</div>
        )}
        <button
          type="submit"
          disabled={loading}
          className={`w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-3 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 flex items-center justify-center transition-all duration-150 hover:scale-[1.02] shadow-md ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
        >
          {loading ? (
            <span className="flex items-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              登录中...
            </span>
          ) : (
            <span className="flex items-center">
              <LogIn size={18} className="mr-2" />
              登录
            </span>
          )}
        </button>
      </form>
      {/* 协议弹窗 */}
      <Modal open={showAgreement} onCancel={() => setShowAgreement(false)} footer={null} title="服务协议与隐私政策">
        <div className="max-h-96 overflow-y-auto p-2 text-gray-700 text-sm">
          <h3 className="font-bold mb-2">服务协议</h3>
          <p>
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