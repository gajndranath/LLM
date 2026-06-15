import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Building2, Mail, Lock, User, ShieldCheck,
  ArrowRight, Loader2, CheckCircle2, Eye, EyeOff, Zap, Star, Infinity as InfinityIcon
} from 'lucide-react';
import { authApi } from '../api/auth.api';
import { useAuthStore } from '../store/authStore';
import { toast } from 'sonner';

type Plan = 'free' | 'pro' | 'mega';

const PLANS: { id: Plan; name: string; price: string; icon: React.ElementType; color: string; features: string[] }[] = [
  {
    id: 'free',
    name: 'Free',
    price: '₹0/mo',
    icon: Zap,
    color: 'from-slate-500 to-slate-600',
    features: ['1 DB Connection', '50 Queries/day', 'Basic SQL Copilot', 'Community Support'],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '₹2,999/mo',
    icon: Star,
    color: 'from-blue-500 to-blue-700',
    features: ['5 DB Connections', '500 Queries/day', 'AI Architect', 'Email Support', 'Query History'],
  },
  {
    id: 'mega',
    name: 'Mega',
    price: '₹9,999/mo',
    icon: InfinityIcon,
    color: 'from-purple-500 to-indigo-700',
    features: ['Unlimited Connections', 'Unlimited Queries', 'All Features', 'Priority Support', 'Custom Integrations'],
  },
];

const OrgRegister = () => {
  const [step, setStep] = useState(1);
  const [companyName, setCompanyName] = useState('');
  const [adminName, setAdminName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [plan, setPlan] = useState<Plan>('free');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName || !adminName || !email || !password) return toast.error('Please fill all fields');

    setLoading(true);
    try {
      await authApi.sendOtp(email);
      toast.success('Verification code sent to your email!');
      setStep(3); // Go to OTP step
    } catch (err: any) {
      toast.error(err.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp) return toast.error('Please enter the OTP');

    setLoading(true);
    try {
      const res = await authApi.registerOrg({ companyName, adminName, email, password, plan, otp });
      const { user } = res.data;
      setAuth(user);
      toast.success(`Welcome to Atlas! ${companyName} is now registered.`);
      navigate('/dashboard');
    } catch (err: any) {
      toast.error(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 -z-10 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -z-10 w-[500px] h-[500px] bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-2 mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-500 to-emerald-400 flex items-center justify-center">
              <Building2 size={20} className="text-white" />
            </div>
            <h1 className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">ATLAS AI</h1>
          </div>
          <p className="text-slate-400">Register your organization and start managing databases intelligently</p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-center mb-8 space-x-2">
          {['Company Details', 'Choose Plan', 'Verify Email'].map((label, i) => (
            <React.Fragment key={i}>
              <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${step === i + 1 ? 'bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/40' : step > i + 1 ? 'bg-emerald-500/10 text-emerald-400' : 'text-slate-600'}`}>
                {step > i + 1 ? <CheckCircle2 size={12} /> : <span className="w-4 h-4 rounded-full bg-current/20 flex items-center justify-center text-[10px]">{i + 1}</span>}
                <span className="hidden sm:inline">{label}</span>
              </div>
              {i < 2 && <div className={`w-8 h-px ${step > i + 1 ? 'bg-emerald-500/40' : 'bg-white/10'}`} />}
            </React.Fragment>
          ))}
        </div>

        <div className="glass p-8 rounded-[2rem] border border-white/5 shadow-2xl">

          {/* Step 1: Company Details */}
          {step === 1 && (
            <div className="space-y-5">
              <h2 className="text-xl font-bold text-white mb-6">Tell us about your company</h2>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Company Name</label>
                <div className="relative group">
                  <Building2 size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                  <input
                    type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full bg-black/20 border border-white/5 text-white pl-10 pr-4 py-3.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all placeholder:text-slate-600 font-medium text-sm"
                    placeholder="Acme Technologies" required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Admin Name (You)</label>
                <div className="relative group">
                  <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                  <input
                    type="text" value={adminName} onChange={(e) => setAdminName(e.target.value)}
                    className="w-full bg-black/20 border border-white/5 text-white pl-10 pr-4 py-3.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all placeholder:text-slate-600 font-medium text-sm"
                    placeholder="Your full name" required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Work Email</label>
                <div className="relative group">
                  <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                  <input
                    type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-black/20 border border-white/5 text-white pl-10 pr-4 py-3.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all placeholder:text-slate-600 font-medium text-sm"
                    placeholder="admin@company.com" required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Password</label>
                <div className="relative group">
                  <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                  <input
                    type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-black/20 border border-white/5 text-white pl-10 pr-11 py-3.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all placeholder:text-slate-600 font-medium text-sm"
                    placeholder="Min 8 chars, upper + lower + number" required
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (!companyName || !adminName || !email || !password) return toast.error('Fill all fields first');
                  setStep(2);
                }}
                className="w-full bg-white text-black font-bold py-3.5 rounded-xl flex items-center justify-center space-x-2 hover:bg-slate-100 transition-all active:scale-95"
              >
                <span>Choose Plan</span>
                <ArrowRight size={18} />
              </button>
            </div>
          )}

          {/* Step 2: Choose Plan */}
          {step === 2 && (
            <div className="space-y-5">
              <h2 className="text-xl font-bold text-white mb-6">Choose your plan</h2>

              <div className="grid gap-3">
                {PLANS.map((p) => (
                  <button
                    key={p.id} type="button" onClick={() => setPlan(p.id)}
                    className={`relative p-4 rounded-2xl border transition-all duration-200 text-left ${plan === p.id ? 'border-blue-500/60 bg-blue-500/10 ring-2 ring-blue-500/30' : 'border-white/5 bg-black/20 hover:border-white/10'}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${p.color} flex items-center justify-center flex-shrink-0`}>
                          <p.icon size={16} className="text-white" />
                        </div>
                        <div>
                          <p className="font-bold text-white text-sm">{p.name}</p>
                          <p className="text-xs text-slate-400">{p.price}</p>
                        </div>
                      </div>
                      {plan === p.id && <CheckCircle2 size={18} className="text-blue-400 flex-shrink-0" />}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {p.features.map((f) => (
                        <span key={f} className="text-[10px] text-slate-400 bg-white/5 px-2 py-0.5 rounded-full">{f}</span>
                      ))}
                    </div>
                  </button>
                ))}
              </div>

              <form onSubmit={handleSendOtp} className="space-y-3">
                <button
                  type="submit" disabled={loading}
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold py-3.5 rounded-xl flex items-center justify-center space-x-2 hover:from-blue-500 hover:to-blue-600 transition-all active:scale-95 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="animate-spin" size={18} /> : (
                    <><span>Send Verification Code</span><ArrowRight size={18} /></>
                  )}
                </button>
                <button type="button" onClick={() => setStep(1)} className="w-full text-slate-400 hover:text-white text-sm py-2 transition-colors">
                  ← Back to details
                </button>
              </form>
            </div>
          )}

          {/* Step 3: OTP Verification */}
          {step === 3 && (
            <form onSubmit={handleRegisterOrg} className="space-y-6">
              <div className="text-center mb-2">
                <div className="w-14 h-14 bg-blue-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 ring-1 ring-blue-500/20">
                  <ShieldCheck size={26} className="text-blue-400" />
                </div>
                <h2 className="text-xl font-bold text-white">Verify your email</h2>
                <p className="text-slate-400 text-sm mt-1">Code sent to <strong className="text-white">{email}</strong></p>
              </div>

              <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-4 space-y-1.5 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">Company</span><span className="text-white font-medium">{companyName}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Plan</span>
                  <span className={`font-bold uppercase text-xs px-2 py-0.5 rounded-full ${plan === 'mega' ? 'bg-purple-500/20 text-purple-400' : plan === 'pro' ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-500/20 text-slate-400'}`}>{plan}</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">6-Digit Code</label>
                <input
                  type="text" value={otp} onChange={(e) => setOtp(e.target.value)} maxLength={6}
                  className="w-full bg-black/20 border border-white/5 text-white text-center text-3xl tracking-[1rem] py-4 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/40 font-bold"
                  placeholder="000000" required
                />
              </div>

              <div className="flex justify-between text-xs px-1">
                <button type="button" onClick={() => setStep(2)} className="text-slate-500 hover:text-white transition-colors">Change plan</button>
                <button type="button" onClick={handleSendOtp} className="text-blue-400 hover:text-blue-300 font-bold">Resend code</button>
              </div>

              <button
                type="submit" disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold py-4 rounded-2xl flex items-center justify-center space-x-2 hover:opacity-90 active:scale-95 disabled:opacity-50 transition-all"
              >
                {loading ? <Loader2 className="animate-spin" size={18} /> : (
                  <><CheckCircle2 size={18} /><span>Create Organization</span></>
                )}
              </button>
            </form>
          )}
        </div>

        <div className="mt-6 text-center">
          <p className="text-slate-500 text-sm">
            Already have an account?{' '}
            <Link to="/login" className="text-blue-400 hover:text-blue-300 font-semibold transition-colors">Sign in</Link>
            {' '}·{' '}
            <Link to="/register" className="text-slate-400 hover:text-white transition-colors">Individual signup</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default OrgRegister;
