import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Building2, Mail, Lock, User, ShieldCheck,
  ArrowRight, Loader2, CheckCircle2, Eye, EyeOff, Zap, Star, Infinity as InfinityIcon,
  Database
} from 'lucide-react';
import { authApi } from '../api/auth.api';
import { useAuthStore } from '../store/authStore';
import { toast } from 'sonner';

type Plan = 'free' | 'pro' | 'mega';

const PLANS: { id: Plan; name: string; price: string; icon: React.ElementType; color: string; desc: string; features: string[] }[] = [
  {
    id: 'free',
    name: 'Free Trial',
    price: '₹0/mo',
    desc: 'Individual developers building prototypes',
    icon: Zap,
    color: 'from-slate-500 to-slate-600',
    features: ['1 Active Database Connection', '50 AI Queries / day', 'Basic 3NF Blueprinting', 'Community Support'],
  },
  {
    id: 'pro',
    name: 'Growth Pro',
    price: '₹1,999/mo',
    desc: 'Scaling engineering teams & startups',
    icon: Star,
    color: 'from-blue-500 to-indigo-600',
    features: ['10 Database Connections', 'Unlimited AI Queries', 'AST Safety Gatekeeper', 'LIFO Rollback Engine', '5 Team Seats'],
  },
  {
    id: 'mega',
    name: 'Mega Enterprise',
    price: '₹7,999/mo',
    desc: 'Companies requiring GitHub CI PR gates',
    icon: InfinityIcon,
    color: 'from-purple-500 to-pink-600',
    features: ['Unlimited DB Connections', 'GitHub Actions PR Gatekeeper', 'Schema Drift Sentinel', '25 Team Seats', '24/7 SLA Priority'],
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
  const [agreeToTerms, setAgreeToTerms] = useState(false);

  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName || !adminName || !email || !password) return toast.error('Please fill all required fields');
    if (!agreeToTerms) return toast.error('You must agree to the Terms of Service & Privacy Policy');

    setLoading(true);
    try {
      await authApi.sendOtp(email);
      toast.success('Verification code dispatched to your email!');
      setStep(3);
    } catch (err: any) {
      toast.error(err.message || 'Failed to send verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp) return toast.error('Please enter the 6-digit OTP');
    if (!agreeToTerms) return toast.error('You must agree to the Terms of Service & Privacy Policy');

    setLoading(true);
    try {
      const res = await authApi.registerOrg({
        companyName,
        adminName,
        email,
        password,
        plan,
        otp,
      });

      const { user } = res.data;
      setAuth(user);
      toast.success(`Organization ${companyName} initialized on ${plan.toUpperCase()} plan!`);
      navigate('/dashboard');
    } catch (err: any) {
      toast.error(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 selection:bg-blue-500/30 flex flex-col justify-between relative overflow-hidden font-sans">
      
      {/* ── Background Glow ── */}
      <div className="absolute top-[-15%] right-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-15%] left-[-10%] w-[50%] h-[50%] bg-purple-600/10 rounded-full blur-[150px] pointer-events-none" />

      {/* ── Top Bar ── */}
      <header className="relative z-20 max-w-7xl mx-auto w-full px-6 h-20 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-all">
            <Database className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white">Atlas AI</span>
        </Link>

        <div className="flex items-center gap-4 text-xs font-semibold text-slate-400">
          <span className="hidden sm:inline">Already registered?</span>
          <Link to="/login" className="text-white hover:text-blue-400 bg-white/5 px-4 py-2 rounded-xl border border-white/5 backdrop-blur-md transition-colors">
            Sign In
          </Link>
        </div>
      </header>

      {/* ── Main Registration Studio ── */}
      <main className="relative z-10 max-w-4xl mx-auto w-full px-6 py-8 my-auto">
        
        {/* Step Indicator Header */}
        <div className="text-center mb-10 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-wider">
            <Building2 size={13} /> Organization Onboarding
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Initialize Your Autonomous DBRE Space
          </h1>
          
          {/* Visual Step Tracker */}
          <div className="flex items-center justify-center pt-2 space-x-3">
            {['1. Organization Profile', '2. Select Plan Tier', '3. Email Verification'].map((label, i) => (
              <React.Fragment key={i}>
                <div className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${step === i + 1 ? 'bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/40' : step > i + 1 ? 'bg-emerald-500/10 text-emerald-400' : 'text-slate-600 bg-white/[0.02]'}`}>
                  {step > i + 1 ? <CheckCircle2 size={13} /> : <span>{i + 1}</span>}
                  <span className="hidden md:inline">{label}</span>
                </div>
                {i < 2 && <div className={`w-6 h-px ${step > i + 1 ? 'bg-emerald-500/40' : 'bg-white/10'}`} />}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Form Container */}
        <div className="glass p-8 sm:p-12 rounded-[2.5rem] border border-white/10 shadow-2xl relative">
          
          {/* STEP 1: Details */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-white">Company & Administrator Profile</h3>
                <p className="text-xs text-slate-400 mt-1">Set up your organization tenant and root administrator credentials.</p>
              </div>

              <div className="grid sm:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Company / Team Name</label>
                  <div className="relative group">
                    <Building2 size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 text-white pl-11 pr-4 py-3.5 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/40 text-sm placeholder:text-slate-600"
                      placeholder="Acme Corp"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Administrator Full Name</label>
                  <div className="relative group">
                    <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                    <input
                      type="text"
                      value={adminName}
                      onChange={(e) => setAdminName(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 text-white pl-11 pr-4 py-3.5 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/40 text-sm placeholder:text-slate-600"
                      placeholder="Alex Mercer"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Work Email Address</label>
                  <div className="relative group">
                    <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 text-white pl-11 pr-4 py-3.5 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/40 text-sm placeholder:text-slate-600"
                      placeholder="alex@acme.com"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Root Password</label>
                  <div className="relative group">
                    <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 text-white pl-11 pr-11 py-3.5 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/40 text-sm placeholder:text-slate-600"
                      placeholder="Min 8 chars (upper, lower, num)"
                      required
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Mandatory Legal Consent Checkbox */}
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex items-start space-x-3">
                <input
                  type="checkbox"
                  id="agreeTerms"
                  checked={agreeToTerms}
                  onChange={(e) => setAgreeToTerms(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded accent-blue-600 cursor-pointer shrink-0"
                  required
                />
                <label htmlFor="agreeTerms" className="text-xs text-slate-400 leading-relaxed cursor-pointer select-none">
                  I agree to the <Link to="/terms" target="_blank" className="text-blue-400 font-bold hover:underline">Terms of Service</Link> & <Link to="/privacy" target="_blank" className="text-blue-400 font-bold hover:underline">Privacy Policy</Link>, and acknowledge Atlas AI operates strictly in read-only sandboxes with universal limitation of liability.
                </label>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (!companyName || !adminName || !email || !password) return toast.error('Please fill all required fields');
                  if (!agreeToTerms) return toast.error('Please accept the Terms of Service to proceed');
                  setStep(2);
                }}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-4 rounded-2xl flex items-center justify-center space-x-2 transition-all transform active:scale-95 shadow-xl shadow-blue-500/20 text-sm"
              >
                <span>Continue to Plan Selection</span>
                <ArrowRight size={18} />
              </button>
            </div>
          )}

          {/* STEP 2: Plan Selection */}
          {step === 2 && (
            <form onSubmit={handleSendOtp} className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-white">Select Your Organization Plan</h3>
                <p className="text-xs text-slate-400 mt-1">Every organization starts with an unrestricted 7-day trial. Upgrade or cancel anytime.</p>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                {PLANS.map((p) => {
                  const Icon = p.icon;
                  const isSelected = plan === p.id;
                  return (
                    <div
                      key={p.id}
                      onClick={() => setPlan(p.id)}
                      className={`p-6 rounded-3xl border transition-all cursor-pointer flex flex-col justify-between ${isSelected ? 'bg-gradient-to-b from-blue-900/40 to-slate-900/90 border-blue-500 ring-2 ring-blue-500/30 scale-102' : 'bg-black/40 border-white/10 hover:border-white/20'}`}
                    >
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${p.color} flex items-center justify-center text-white shadow-lg`}>
                            <Icon size={20} />
                          </div>
                          {isSelected && <CheckCircle2 size={18} className="text-blue-400" />}
                        </div>
                        <div>
                          <h4 className="font-bold text-white text-base">{p.name}</h4>
                          <p className="text-[11px] text-slate-400 mt-0.5 h-7">{p.desc}</p>
                          <div className="text-2xl font-black text-white mt-3">{p.price}</div>
                        </div>
                        <ul className="space-y-2 border-t border-white/5 pt-4 text-xs text-slate-300">
                          {p.features.map((feat, idx) => (
                            <li key={idx} className="flex items-center gap-1.5 text-[11px]">
                              <CheckCircle2 size={12} className="text-blue-400 shrink-0" />
                              <span>{feat}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="w-1/3 py-4 bg-white/5 hover:bg-white/10 text-slate-300 font-bold rounded-2xl transition-all text-xs"
                >
                  ← Back to Details
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-2/3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-4 rounded-2xl flex items-center justify-center space-x-2 transition-all transform active:scale-95 shadow-xl shadow-blue-500/20 disabled:opacity-50 text-sm"
                >
                  {loading ? <Loader2 className="animate-spin" size={18} /> : (
                    <>
                      <span>Dispatch Email OTP Verification</span>
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: OTP Verification */}
          {step === 3 && (
            <form onSubmit={handleRegisterOrg} className="space-y-6 max-w-md mx-auto">
              <div className="text-center space-y-2">
                <div className="w-14 h-14 bg-blue-500/10 rounded-2xl flex items-center justify-center mx-auto mb-2 ring-1 ring-blue-500/20">
                  <ShieldCheck size={28} className="text-blue-400" />
                </div>
                <h3 className="text-2xl font-bold text-white">Verify Work Email</h3>
                <p className="text-xs text-slate-400">
                  We've sent a 6-digit cryptographic verification code to <strong className="text-white">{email}</strong>
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-2 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Organization:</span>
                  <span className="text-white font-bold">{companyName}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Selected Plan:</span>
                  <span className="text-blue-400 font-bold uppercase">{plan} (7-Day Free Trial)</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider text-center block">Enter 6-Digit Code</label>
                <input
                  type="text"
                  maxLength={6}
                  required
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 text-white py-4 rounded-2xl font-mono text-2xl text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                  placeholder="123456"
                />
              </div>

              <div className="space-y-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-2xl flex items-center justify-center space-x-2 transition-all transform active:scale-95 shadow-xl shadow-emerald-600/20 disabled:opacity-50 text-sm"
                >
                  {loading ? <Loader2 className="animate-spin" size={18} /> : (
                    <>
                      <span>Complete Registration & Launch Console</span>
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="w-full text-slate-400 hover:text-white text-xs py-2 transition-colors text-center block"
                >
                  ← Change Plan or Email
                </button>
              </div>
            </form>
          )}

        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="relative z-20 border-t border-white/5 py-6 px-6 text-center text-xs text-slate-600 bg-black/40 backdrop-blur-md">
        © {new Date().getFullYear()} Atlas AI Intelligence Platform. All rights reserved.
      </footer>
    </div>
  );
};

export default OrgRegister;
