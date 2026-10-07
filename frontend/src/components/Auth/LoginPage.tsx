// src/components/Auth/LoginPage.tsx
import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import logo from '../../assets/logo.jpg';

export const LoginPage: React.FC = () => {
  const { login, register } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await login(username, password);
      } else {
        if (password !== confirmPassword) {
          setError('كلمتا المرور غير متطابقتين');
          setLoading(false);
          return;
        }
        if (password.length < 6) {
          setError('يجب أن تكون كلمة المرور 6 أحرف على الأقل');
          setLoading(false);
          return;
        }
        await register(username, email, password);
      }
    } catch (err: any) {
      setError(err.message || 'فشل المصادقة');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
         <div className="login-logo">
            <img src={logo} alt="شعار المدرسة" />
          </div>
        <div className="login-header">
          <h1>المسير المدرسي</h1>
          <p>{isLogin ? 'تسجيل الدخول إلى حسابك' : 'إنشاء حساب جديد'}</p>
        </div>
        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="login-error">{error}</div>}
          <div className="form-group">
            <label>اسم المستخدم</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="أدخل اسم المستخدم"
              required
            />
          </div>
          {!isLogin && (
            <div className="form-group">
              <label>البريد الإلكتروني</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="أدخل البريد الإلكتروني"
                required
              />
            </div>
          )}
          <div className="form-group">
            <label>كلمة المرور</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="أدخل كلمة المرور"
              required
            />
          </div>
          {!isLogin && (
            <div className="form-group">
              <label>تأكيد كلمة المرور</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="أكد كلمة المرور"
                required
              />
            </div>
          )}
          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? <i className="fas fa-spinner fa-spin"></i> : (isLogin ? 'تسجيل الدخول' : 'التسجيل')}
          </button>
        </form>
        <p className="login-switch">
          {isLogin ? "ليس لديك حساب؟ " : "لديك حساب بالفعل؟ "}
          <button onClick={() => { setIsLogin(!isLogin); setError(''); }}>
            {isLogin ? 'التسجيل' : 'تسجيل الدخول'}
          </button>
        </p>
      </div>
    </div>
  );
};