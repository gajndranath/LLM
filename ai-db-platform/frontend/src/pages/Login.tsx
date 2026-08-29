import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Database, 
  Lock, 
  Mail, 
  Loader2, 
  ArrowRight, 
  Eye,
  EyeOff,
  ShieldCheck,
  Zap,
  Layers
} from 'lucide-react';
import { authApi } from '../api/auth.api';
import { useAuthStore } from '../store/authStore';
import { toast } from 'sonner';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Forgot Password States
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  
  const setAuth = useAuthStore((state) => state.setAuth);

  useEffect(() => {
    let timer: any;
    if (countdown > 0) {
      timer = setInterval(() => setCountdown(prev => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [countdown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await authApi.login({ email, password });
      const { user } = res.data;
      setAuth(user);
      toast.success("Welcome back!");
    } catch (err: any) {
      toast.error(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendResetOtp = async () => {
    if (!forgotEmail.trim()) return toast.error('Please enter your email address');
    setResetLoading(true);
    try {
      await authApi.forgotPassword(forgotEmail);
      toast.success('Reset OTP sent to your email!');
      setOtpSent(true);
      setCountdown(60);
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Failed to send OTP');
    } finally {
      setResetLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotOtp || !newPassword) return toast.error('Please enter OTP and new password');
    if (newPassword.length < 8) return toast.error('Password must be at least 8 characters');
    setResetLoading(true);
    try {
      await authApi.resetPassword({
        email: forgotEmail,
        otp: forgotOtp,
        newPassword
      });
      toast.success('Password updated successfully! You can now login.');
      setShowForgotModal(false);
      setOtpSent(false);
      setForgotEmail('');
      setForgotOtp('');
      setNewPassword('');
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Failed to reset password');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 flex flex-col justify-between selection:bg-blue-500/30 relative overflow-hidden font-sans">
      
      {/* ── Ambient Background Glow ── */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-600/15 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-600/15 rounded-full blur-[160px] pointer-events-none" />

      {/* ── Top Bar ── */}
      <header className="relative z-20 max-w-7xl mx-auto w-full px-6 h-20 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-all">
            <Database className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white">Schemio</span>
        </Link>

        <Link to="/" className="text-xs font-bold text-slate-400 hover:text-white flex items-center gap-1.5 bg-white/5 px-4 py-2 rounded-xl border border-white/5 backdrop-blur-md hover:bg-white/10 transition-all">
          <ArrowRight className="rotate-180" size={14} /> Back to Overview
        </Link>
      </header>

      {/* ── Split Layout Hero ── */}
      <main className="relative z-10 max-w-7xl mx-auto w-full px-6 py-10 grid lg:grid-cols-12 gap-12 items-center my-auto">
        
        {/* Left Side: Enterprise Feature Showcase & Social Proof */}
        <div className="lg:col-span-6 space-y-8 hidden lg:block pr-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-wider">
            <ShieldCheck size={14} /> Enterprise Security Gateway
          </div>
          
          <h1 className="text-4xl xl:text-5xl font-black text-white tracking-tight leading-tight">
            Autonomous DBRE Mission Control.
          </h1>
          
          <p className="text-slate-400 text-base leading-relaxed max-w-lg">
            Authenticate to access your 3NF Architect Studio, AST PR Migration Gates, and live Out-of-Band Schema Drift Sentinels.
          </p>

          <div className="space-y-4 pt-2">
            <div className="flex items-start gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5">
              <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 shrink-0">
                <Zap size={18} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Zero-Knowledge Sandbox</h4>
                <p className="text-xs text-slate-400 mt-0.5">All audits run in isolated `READ ONLY` transactions. Zero customer row persistence.</p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5">
              <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 shrink-0">
                <Layers size={18} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">4-Agent DAG Verification</h4>
                <p className="text-xs text-slate-400 mt-0.5">Marcus, Sophia, Optimus, and Victor audit every query with AST precision.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Sleek Login Card */}
        <div className="lg:col-span-6 flex justify-center lg:justify-end">
          <div className="w-full max-w-md glass p-8 sm:p-10 rounded-[2.5rem] border border-white/10 shadow-2xl relative">
            <div className="mb-8">
              <span className="text-xs font-bold uppercase tracking-widest text-blue-400">Welcome Back</span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">Sign In to Workspace</h2>
              <p className="text-slate-400 text-xs mt-1">Enter your organization credentials</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Work Email</label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" size={18} />
                  <input
                    type="email"
                    required
                    className="w-full bg-black/40 border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 transition-all font-medium text-sm"
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center px-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Password</label>
                  <button
                    type="button"
                    onClick={() => {
                      setForgotEmail(email);
                      setShowForgotModal(true);
                    }}
                    className="text-[11px] text-blue-400 font-bold hover:text-blue-300 transition-colors"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" size={18} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    className="w-full bg-black/40 border border-white/10 rounded-2xl py-3.5 pl-12 pr-12 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 transition-all font-medium text-sm"
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-4 rounded-2xl flex items-center justify-center space-x-2 transition-all transform active:scale-95 shadow-xl shadow-blue-500/20 disabled:opacity-50 text-sm"
              >
                {loading ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  <>
                    <span>Authenticate to Console</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-white/5 text-center space-y-4">
              <p className="text-xs text-slate-400">
                New company or engineering team?{' '}
                <Link to="/register-org" className="text-blue-400 font-bold hover:text-blue-300">
                  Register Organization
                </Link>
              </p>
              <div className="flex items-center justify-center gap-4 text-[11px] text-slate-500 font-medium pt-1">
                <Link to="/terms" className="hover:text-slate-300 transition-colors">Terms of Service</Link>
                <span>•</span>
                <Link to="/privacy" className="hover:text-slate-300 transition-colors">Privacy Policy</Link>
              </div>
            </div>
          </div>
        </div>

      </main>

      {/* ── Footer ── */}
      <footer className="relative z-20 border-t border-white/5 py-6 px-6 text-center text-xs text-slate-600 bg-black/40 backdrop-blur-md">
        © {new Date().getFullYear()} Schemio Platform. All rights reserved.
      </footer>

      {/* ── FORGOT PASSWORD / OTP MODAL ── */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md glass p-8 rounded-3xl border border-white/10 space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-white">Reset Account Password</h3>
              <button
                onClick={() => setShowForgotModal(false)}
                className="text-slate-400 hover:text-white text-xs font-bold px-2.5 py-1 bg-white/5 rounded-lg"
              >
                ✕ Close
              </button>
            </div>

            {!otpSent ? (
              <div className="space-y-4">
                <p className="text-xs text-slate-400 leading-relaxed">
                  Enter your verified work email address. We will dispatch a 6-digit cryptographic OTP to reset your password.
                </p>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                  <input
                    type="email"
                    required
                    className="w-full bg-black/40 border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 text-white placeholder:text-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                    placeholder="name@company.com"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSendResetOtp}
                  disabled={resetLoading}
                  className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl hover:bg-blue-500 transition-all text-xs flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  {resetLoading ? <Loader2 className="animate-spin" size={16} /> : <span>Dispatch Reset Code</span>}
                </button>
              </div>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">6-Digit Verification Code</label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    className="w-full bg-black/40 border border-white/10 rounded-2xl py-3 px-4 text-center font-mono text-xl tracking-widest text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                    placeholder="123456"
                    value={forgotOtp}
                    onChange={(e) => setForgotOtp(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">New Password</label>
                  <input
                    type="password"
                    required
                    className="w-full bg-black/40 border border-white/10 rounded-2xl py-3.5 px-4 text-white placeholder:text-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                    placeholder="Min 8 chars, 1 upper, 1 lower, 1 number"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={handleSendResetOtp}
                    disabled={countdown > 0 || resetLoading}
                    className="text-xs text-blue-400 hover:underline disabled:text-slate-600 disabled:no-underline font-medium"
                  >
                    {countdown > 0 ? `Resend OTP in ${countdown}s` : 'Resend Code'}
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={resetLoading}
                  className="w-full bg-emerald-600 text-white font-bold py-3.5 rounded-xl hover:bg-emerald-500 transition-all text-xs flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  {resetLoading ? <Loader2 className="animate-spin" size={16} /> : <span>Update & Verify Password</span>}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
