import { Link } from 'react-router-dom';
import { Hammer, Sparkles, ShieldAlert } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useState } from 'react';
import { api } from '../api/axiosInstance';
import { toast } from 'sonner';

export default function MaintenancePage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';
  const [isChecking, setIsChecking] = useState(false);

  const checkStatus = async () => {
    setIsChecking(true);
    try {
      // Bypassing maintenance explicitly to check status
      const res = await api.get('/super-admin/maintenance', { headers: { 'x-bypass-maintenance': 'true' } });
      if (!res.data?.data?.isMaintenance) {
        window.location.href = '/dashboard';
      } else {
        toast.info("System is still under maintenance.");
      }
    } catch (err) {
      toast.info("System is still under maintenance.");
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-amber-600/10 rounded-full blur-[120px] pointer-events-none" />
      
      <div className="glass max-w-xl w-full p-12 rounded-[3rem] border border-white/5 shadow-2xl relative z-10 text-center space-y-8 animate-in fade-in slide-in-from-bottom-10 duration-700">
        <div className="relative w-24 h-24 mx-auto">
          <div className="absolute inset-0 bg-blue-500/20 rounded-3xl rotate-12 animate-pulse" />
          <div className="absolute inset-0 bg-white/5 rounded-3xl backdrop-blur-xl border border-white/10 flex items-center justify-center shadow-2xl">
            <Hammer size={40} className="text-blue-400" />
          </div>
          <Sparkles className="absolute -top-4 -right-4 text-amber-400 animate-bounce" size={24} />
        </div>

        <div className="space-y-4">
          <h1 className="text-4xl font-black text-white tracking-tight">System Maintenance</h1>
          <p className="text-slate-400 text-lg leading-relaxed">
            ATLAS is currently undergoing scheduled maintenance to improve performance and stability. 
            Mutating operations (Deployments, Queries) are temporarily disabled.
          </p>
        </div>

        <div className="pt-8 flex flex-col items-center space-y-4">
          <button 
            onClick={checkStatus}
            disabled={isChecking}
            className="px-8 py-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-2xl font-bold text-sm tracking-widest uppercase transition-all shadow-lg shadow-blue-600/20"
          >
            {isChecking ? 'Checking...' : 'Check Status'}
          </button>
          
          {isAdmin && (
            <div className="mt-8 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center space-x-3 text-left w-full">
              <ShieldAlert size={24} className="text-amber-400 shrink-0" />
              <div>
                <p className="text-sm font-bold text-amber-400 uppercase tracking-wider mb-1">Admin Bypass</p>
                <p className="text-xs text-slate-400">As an administrator, you can bypass this lock by navigating to the dashboard manually. Your requests will require the bypass header.</p>
                <Link to="/super-admin" className="text-xs font-bold text-amber-400 hover:text-amber-300 mt-2 inline-block underline">
                  Go to Super Admin Panel
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
