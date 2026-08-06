import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../hooks/useToast';
import { getErrorMessage } from '../../services/api';
import { Eye, EyeOff, Loader2, Mail, Lock, Shield, AlertCircle } from 'lucide-react';

const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [show2FA, setShow2FA] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    twoFactorCode: '',
    rememberMe: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.email) newErrors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = 'Invalid email format';
    if (!formData.password) newErrors.password = 'Password is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    try {
      await login({
        email: formData.email,
        password: formData.password,
        rememberMe: formData.rememberMe,
        twoFactorCode: formData.twoFactorCode || undefined,
      });
      toast.success('Welcome back!');
      navigate('/lobby');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Login failed'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? e.target.checked : value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative z-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-10 animate-fade-in">
          <Link to="/" className="inline-block mb-6">
            <svg className="w-16 h-16 mx-auto text-gold-400" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M16 2L4 8v16l12 6 12-6V8L16 2z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
              <path d="M16 8V24" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <path d="M8 14h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </Link>
          <h1 className="text-4xl font-cinzel font-bold text-gradient mb-3">Welcome Back</h1>
          <p className="text-mystery-300">Enter the mansion and uncover the truth</p>
        </div>

        <div className="card border-gradient animate-slide-up">
          <div className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="email" className="label">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-mystery-400" />
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={formData.email}
                    onChange={handleChange}
                    className={`input pl-12 ${errors.email ? 'input-error' : ''}`}
                    placeholder="detective@mysterymansion.com"
                    disabled={isLoading}
                    aria-invalid={!!errors.email}
                    aria-describedby={errors.email ? 'email-error' : undefined}
                  />
                </div>
                {errors.email && (
                  <p id="email-error" className="mt-1.5 text-sm text-red-400 flex items-center gap-1" role="alert">
                    <AlertCircle className="w-4 h-4" /> {errors.email}
                  </p>
                )}
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label htmlFor="password" className="label mb-0">Password</label>
                  <button type="button" onClick={() => setShow2FA(!show2FA)} className="text-sm text-gold-400 hover:text-gold-300">
                    {show2FA ? 'Hide 2FA code' : 'Have a 2FA code?'}
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-mystery-400" />
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={formData.password}
                    onChange={handleChange}
                    className={`input pl-12 pr-12 ${errors.password ? 'input-error' : ''}`}
                    placeholder="••••••••"
                    disabled={isLoading}
                    aria-invalid={!!errors.password}
                    aria-describedby={errors.password ? 'password-error' : undefined}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-mystery-400 hover:text-mystery-200"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {errors.password && (
                  <p id="password-error" className="mt-1.5 text-sm text-red-400 flex items-center gap-1" role="alert">
                    <AlertCircle className="w-4 h-4" /> {errors.password}
                  </p>
                )}
              </div>

                            {show2FA && (
                <div>
                  <label htmlFor="2fa" className="label">Two-Factor Code</label>
                  <div className="relative">
                    <Shield className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-mystery-400" />
                    <input
                      id="2fa"
                      name="twoFactorCode"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      value={formData.twoFactorCode}
                      onChange={handleChange}
                      className="input pl-12 tracking-[0.3em] font-mono"
                      placeholder="000000"
                      disabled={isLoading}
                    />
                  </div>
                  <p className="mt-1.5 text-xs text-mystery-400">Enter the 6-digit code from your authenticator app.</p>
                </div>
              )}

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    name="rememberMe"
                    type="checkbox"
                    checked={formData.rememberMe}
                    onChange={handleChange}
                    className="w-4 h-4 accent-gold-500 rounded border-mystery-600 bg-mystery-800 focus:ring-gold-500"
                  />
                  <span className="text-sm text-mystery-300">Remember me</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="btn-primary w-full py-4 text-lg"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Entering Mansion...
                  </>
                ) : (
                  'Enter the Mansion'
                )}
              </button>
            </form>

            <div className="mt-8 relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-mystery-600" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-mystery-800/50 text-mystery-400">Or continue with</span>
              </div>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-3">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => toast.info('Google OAuth coming soon')}
                disabled={isLoading}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-3.33-1.5-3.33-1.5V12H6.71v2.84c1.22.97 3.16 1.73 5.29 1.73z"/><path fill="currentColor" d="M6.71 12H2v-2.84c3.18-1.74 6.48-2.58 9.29-2.58 2.34 0 4.38.66 5.73 1.8l3.53-2.8C17.63 4.37 14.54 2.75 11 2.75 6.26 2.75 2.08 5.33.82 9.33l3.78 3.36c1.12-1.26 2.88-1.82 4.85-1.82 3.73 0 6.8 2.89 6.8 6.84 0 .42-.04.84-.1 1.24H12v-2.77c-.02-.17-.02-.34-.02-.51 0-.52.02-1.04.05-1.56H22.56z"/></svg>
                <span>Google</span>
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => toast.info('GitHub OAuth coming soon')}
                disabled={isLoading}
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/></svg>
                <span>GitHub</span>
              </button>
            </div>

            <p className="mt-8 text-center text-mystery-400">
              New to the mansion?{' '}
              <Link to="/register" className="link font-medium">Create an account</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;