import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ShieldCheck, Lock, User, Loader2, CheckCircle2, XCircle, Eye, EyeOff, Building2 } from 'lucide-react';
import { adminApi } from '../api/auth.api';
import { toast } from 'sonner';

interface InviteData {
  email: string;
  name: string | null;
  role: string;
  organization_name: string;
  expires_at: string;
}

const InviteAcceptPage = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [invite, setInvite] = useState<InviteData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) return;
    adminApi.getInvite(token)
      .then((res: any) => {
        const data = res.data;
        setInvite(data);
        if (data.name) setName(data.name);
      })
      .catch((err: any) => setError(err.message || 'Invalid or expired invite link'))
      .finally(() => setLoading(false));
  }, [token]);

  const handleAccept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSubmitting(true);
    try {
      await adminApi.acceptInvite(token, { name, password });
      setSuccess(true);
      toast.success('Account created! Redirecting to login...');
      setTimeout(() => navigate('/login'), 2500);
    } catch (err: any) {
      toast.error(err.message || 'Failed to accept invite');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 -z-10 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl opacity-20" />
      <div className="absolute bottom-0 left-0 -z-10 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl opacity-20" />

      <div className="w-full max-w-md glass p-10 rounded-[2.5rem] shadow-2xl border border-white/5">
        {/* Loading */}
        {loading && (
          <div className="text-center py-12">
            <Loader2 className="animate-spin mx-auto text-blue-400 mb-4" size={40} />
            <p className="text-slate-400">Validating your invite...</p>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <XCircle size={32} className="text-red-400" />
            </div>
            <h2 className="text-xl font-bold text-white mb-3">Invite Invalid</h2>
            <p className="text-slate-400 mb-6">{error}</p>
            <button onClick={() => navigate('/login')} className="text-blue-400 hover:text-blue-300 font-semibold text-sm">
              Go to Login →
            </button>
          </div>
        )}

        {/* Success */}
        {success && (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 size={32} className="text-emerald-400" />
            </div>
            <h2 className="text-xl font-bold text-white mb-3">Account Created!</h2>
            <p className="text-slate-400">Redirecting you to login...</p>
          </div>
        )}

        {/* Form */}
        {!loading && !error && !success && invite && (
          <>
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mx-auto mb-5 ring-1 ring-blue-500/20">
                <ShieldCheck size={30} className="text-blue-400" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-1">You're invited!</h1>
              <p className="text-slate-400 text-sm">Join your team on Atlas AI</p>
            </div>

            {/* Invite details */}
            <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-4 mb-6 space-y-2">
              <div className="flex items-center space-x-2 mb-3">
                <Building2 size={14} className="text-blue-400" />
                <p className="text-blue-400 font-semibold text-sm">{invite.organization_name}</p>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Your email</span>
                <span className="text-white font-medium">{invite.email}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Your role</span>
                <span className="bg-blue-500/20 text-blue-400 text-xs font-bold px-2 py-0.5 rounded-full uppercase">{invite.role}</span>
              </div>
            </div>

            <form onSubmit={handleAccept} className="space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Your Full Name</label>
                <div className="relative group">
                  <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                  <input
                    type="text" value={name} onChange={(e) => setName(e.target.value)}
                    className="w-full bg-black/20 border border-white/5 text-white pl-10 pr-4 py-4 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all placeholder:text-slate-600 font-medium"
                    placeholder="Enter your full name" required minLength={2}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Set Password</label>
                <div className="relative group">
                  <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                  <input
                    type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-black/20 border border-white/5 text-white pl-10 pr-12 py-4 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all placeholder:text-slate-600 font-medium"
                    placeholder="Min 8 chars, upper + lower + number" required
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-600 ml-1">Must be 8+ characters with uppercase, lowercase & number</p>
              </div>

              <button
                type="submit" disabled={submitting}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold py-4 rounded-2xl flex items-center justify-center space-x-2 hover:opacity-90 active:scale-95 disabled:opacity-50 transition-all"
              >
                {submitting ? <Loader2 className="animate-spin" size={18} /> : (
                  <><CheckCircle2 size={18} /><span>Accept Invite & Create Account</span></>
                )}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default InviteAcceptPage;
