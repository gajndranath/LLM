import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Database, 
  Lock, 
  Mail, 
  Loader2, 
  ArrowRight, 
  ShieldCheck,
  Eye,
  EyeOff
} from 'lucide-react';
import { authApi } from '../api/auth.api';
import { useAuthStore } from '../store/authStore';
import { toast } from 'sonner';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const setAuth = useAuthStore((state) => state.setAuth);

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

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-950 relative overflow-hidden">
      {/* Decorative Orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-600/10 rounded-full blur-[120px]" />

      <div className="w-full max-w-md glass p-10 rounded-[2.5rem] shadow-2xl relative z-10 border border-white/5">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/5 mb-6 ring-1 ring-white/10">
            <Database className="text-blue-400" size={32} />
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-white mb-2 leading-tight">Welcome Back</h2>
          <p className="text-slate-400 font-medium">Access your AI database architect</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Email Address</label>
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" size={18} />
              <input
                type="email"
                required
                className="w-full bg-black/20 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 transition-all font-medium"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center px-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Password</label>
              <a href="#" className="text-[10px] text-blue-400 font-bold hover:text-blue-300">Forgot?</a>
            </div>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" size={18} />
              <input
                type={showPassword ? "text" : "password"}
                required
                className="w-full bg-black/20 border border-white/5 rounded-2xl py-4 pl-12 pr-12 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 transition-all font-medium"
                placeholder="••••••••"
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
            className="w-full bg-white text-black font-bold py-4 rounded-2xl transition-all duration-300 transform active:scale-[0.98] shadow-xl flex items-center justify-center space-x-2 mt-4 hover:bg-slate-200 disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" /> : (
              <>
                <span>Sign In to Platform</span>
                <ArrowRight size={20} />
              </>
            )}
          </button>
        </form>

        <div className="mt-10 pt-8 border-t border-white/5 text-center">
          <p className="text-slate-400 font-medium">
            New to the platform?{' '}
            <Link to="/register-org" className="text-white font-bold hover:text-blue-400 transition-colors underline underline-offset-4">
              Register your company
            </Link>
          </p>
        </div>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center space-x-2 text-slate-500">
        <ShieldCheck size={14} />
        <span className="text-[10px] uppercase font-bold tracking-widest">Enterprise Secure Session</span>
      </div>
    </div>
  );
};

export default Login;
