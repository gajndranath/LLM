import { useState, useEffect } from 'react';
import { 
  Building2, Users, Database, Activity, TrendingUp, DollarSign,
  Loader2, Search, ShieldCheck, Star, Hammer
} from 'lucide-react';
import { superAdminApi } from '../api/auth.api';
import { toast } from 'sonner';
import { PlansManager } from '../components/PlansManager';
import { FinancialDashboard } from '../components/FinancialDashboard';
import { useAuthStore } from '../store/authStore';
import { LogOut, Home, Settings as SettingsIcon, CreditCard } from 'lucide-react';

const SuperAdminDashboard = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'plans' | 'finances'>('overview');
  const logout = useAuthStore(state => state.logout);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [orgs, setOrgs] = useState<any[]>([]);
  const [recentSignups, setRecentSignups] = useState<any[]>([]);
  const [topOrgs, setTopOrgs] = useState<any[]>([]);
  const [plansList, setPlansList] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isMaintenance, setIsMaintenance] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statsRes, orgsRes, recentRes, topRes] = await Promise.all([
        superAdminApi.getStats(),
        superAdminApi.listOrganizations({ page, limit: 10, search }),
        superAdminApi.getRecentSignups(5),
        superAdminApi.getTopOrgs(5)
      ]);
      const { api } = await import('../api/axiosInstance');
      const plansRes = await api.get('/super-admin/plans').catch(() => ({ data: { data: [] } }));
      const maintRes = await api.get('/super-admin/maintenance').catch(() => ({ data: { data: { isMaintenance: false } } }));
      
      setPlansList(plansRes.data.data);
      setIsMaintenance(maintRes.data?.data?.isMaintenance || false);
      setStats(statsRes.data);
      setOrgs(orgsRes.data.organizations);
      setTotalPages(orgsRes.data.totalPages);
      setRecentSignups(recentRes.data);
      setTopOrgs(topRes.data);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const toggleMaintenance = async () => {
    try {
      const { api } = await import('../api/axiosInstance');
      const res = await api.post('/super-admin/maintenance/toggle');
      setIsMaintenance(res.data.data.isMaintenance);
      toast.success(`Maintenance mode is now ${res.data.data.isMaintenance ? 'ON' : 'OFF'}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to toggle maintenance mode');
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchData();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [search, page]);

  const handleToggleStatus = async (orgId: string, currentStatus: boolean) => {
    try {
      await superAdminApi.toggleOrgStatus(orgId, !currentStatus);
      toast.success(currentStatus ? 'Organization deactivated' : 'Organization activated');
      fetchData();
    } catch {
      toast.error('Failed to toggle status');
    }
  };

  const handlePlanChange = async (orgId: string, newPlan: string) => {
    try {
      await superAdminApi.updateOrgPlan(orgId, newPlan);
      toast.success('Plan updated successfully');
      fetchData();
    } catch {
      toast.error('Failed to update plan');
    }
  };

  if (loading && !stats) {
    return <div className="flex h-full items-center justify-center"><Loader2 className="animate-spin text-blue-400" size={40} /></div>;
  }

  return (
    <div className="flex h-full bg-black">
      {/* Sidebar Navigation */}
      <div className="w-64 border-r border-white/5 bg-slate-900/20 p-6 flex flex-col h-full">
        <div className="flex items-center space-x-2 mb-8">
          <ShieldCheck size={28} className="text-emerald-400" />
          <h1 className="text-2xl font-black text-white">Super Admin</h1>
        </div>
        
        <nav className="flex-1 space-y-2">
          <button 
            onClick={() => setActiveTab('overview')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'overview' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
          >
            <Home size={18} /> <span>Overview</span>
          </button>
          <button 
            onClick={() => setActiveTab('finances')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'finances' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
          >
            <CreditCard size={18} /> <span>Financial Analytics</span>
          </button>
          <button 
            onClick={() => setActiveTab('plans')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'plans' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
          >
            <SettingsIcon size={18} /> <span>Plans & Pricing</span>
          </button>
        </nav>

        <div className="mt-auto pt-6 border-t border-white/5">
          <button 
            onClick={logout}
            className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <LogOut size={18} /> <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-8 space-y-8">
        
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-white capitalize">
              {activeTab === 'overview' ? 'Platform Overview' : activeTab === 'finances' ? 'Financial Hub' : 'Plans & Pricing'}
            </h2>
            <p className="text-slate-400 text-sm mt-1">Super Admin Controls</p>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={toggleMaintenance}
              className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center space-x-2 transition-all ${
                isMaintenance 
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/50 shadow-lg shadow-amber-500/10' 
                : 'bg-white/5 text-slate-400 hover:text-white border border-white/5 hover:bg-white/10'
              }`}
            >
              <Hammer size={16} />
              <span>{isMaintenance ? 'MAINTENANCE ON' : 'MAINTENANCE OFF'}</span>
            </button>
            <div className="bg-slate-800/50 border border-white/5 px-4 py-2 rounded-xl text-sm font-mono text-slate-300 flex items-center space-x-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>System Live</span>
            </div>
          </div>
        </div>

        {activeTab === 'plans' && <PlansManager />}
        
        {activeTab === 'finances' && <FinancialDashboard />}

        {activeTab === 'overview' && (
          <>
            {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="glass rounded-3xl p-6 border border-blue-500/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10"><Building2 size={80} /></div>
            <p className="text-slate-400 font-medium mb-1">Total Organizations</p>
            <h2 className="text-4xl font-black text-white">{stats.organizations?.total_active || 0}</h2>
            <p className="text-sm text-emerald-400 flex items-center mt-2">
              <TrendingUp size={14} className="mr-1" /> +{stats.organizations?.new_this_week || 0} this week
            </p>
          </div>
          
          <div className="glass rounded-3xl p-6 border border-purple-500/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10"><Users size={80} /></div>
            <p className="text-slate-400 font-medium mb-1">Total Users</p>
            <h2 className="text-4xl font-black text-white">{stats.users?.total_users || 0}</h2>
            <p className="text-sm text-slate-400 flex items-center mt-2">
              <Activity size={14} className="mr-1" /> {stats.users?.active_last_7d || 0} active in last 7 days
            </p>
          </div>

          <div className="glass rounded-3xl p-6 border border-amber-500/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10"><Database size={80} /></div>
            <p className="text-slate-400 font-medium mb-1">Total Queries</p>
            <h2 className="text-4xl font-black text-white">{stats.queries?.total_queries || 0}</h2>
            <p className="text-sm text-amber-400 flex items-center mt-2">
              <TrendingUp size={14} className="mr-1" /> {stats.queries?.queries_today || 0} today
            </p>
          </div>

          <div className="glass rounded-3xl p-6 border border-emerald-500/20 relative overflow-hidden bg-gradient-to-br from-emerald-500/10 to-transparent">
            <div className="absolute top-0 right-0 p-4 opacity-10"><DollarSign size={80} /></div>
            <p className="text-slate-400 font-medium mb-1">Paid Plans</p>
            <div className="flex items-baseline space-x-2">
              <h2 className="text-4xl font-black text-white">{(stats.planBreakdown?.pro || 0) + (stats.planBreakdown?.mega || 0)}</h2>
              <span className="text-sm text-slate-400">/ {stats.organizations?.total_active || 0}</span>
            </div>
            <div className="flex gap-2 mt-2">
              <span className="text-[10px] uppercase px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400">PRO: {stats.planBreakdown?.pro || 0}</span>
              <span className="text-[10px] uppercase px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400">MEGA: {stats.planBreakdown?.mega || 0}</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Organizations List (Takes up 2 cols) */}
        <div className="lg:col-span-2 glass rounded-3xl border border-white/5 overflow-hidden flex flex-col">
          <div className="p-6 border-b border-white/5 flex items-center justify-between">
            <h2 className="font-bold text-white text-lg flex items-center space-x-2">
              <Building2 size={20} className="text-blue-400" />
              <span>Organizations</span>
            </h2>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input 
                type="text" 
                placeholder="Search orgs..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-black/20 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-white/5 text-slate-400 text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4 font-medium">Organization</th>
                  <th className="px-6 py-4 font-medium">Plan</th>
                  <th className="px-6 py-4 font-medium">Users</th>
                  <th className="px-6 py-4 font-medium">Queries</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {orgs.map((org) => (
                  <tr key={org.id} className={`hover:bg-white/5 transition-colors ${!org.is_active ? 'opacity-50' : ''}`}>
                    <td className="px-6 py-4">
                      <p className="font-bold text-white">{org.name}</p>
                      <p className="text-xs text-slate-500">{org.admin_email}</p>
                    </td>
                    <td className="px-6 py-4">
                      <select 
                        value={org.plan}
                        onChange={(e) => handlePlanChange(org.id, e.target.value)}
                        className={`text-xs font-bold px-2 py-1 rounded-full outline-none appearance-none cursor-pointer text-center bg-blue-500/20 text-blue-400`}
                      >
                        {plansList.map(p => (
                          <option key={p.id} value={p.code}>{p.name.toUpperCase()}</option>
                        ))}
                        {plansList.length === 0 && <option value={org.plan}>{org.plan.toUpperCase()}</option>}
                      </select>
                    </td>
                    <td className="px-6 py-4 text-slate-300 font-medium">{org.member_count}</td>
                    <td className="px-6 py-4 text-slate-300 font-medium">{org.query_count}</td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => handleToggleStatus(org.id, org.is_active)}
                        className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-colors ${
                          org.is_active ? 'border-red-500/30 text-red-400 hover:bg-red-500/10' : 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10'
                        }`}
                      >
                        {org.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {orgs.length === 0 && !loading && (
              <div className="p-12 text-center text-slate-500">No organizations found.</div>
            )}
          </div>
          
          {/* Pagination */}
          <div className="p-4 border-t border-white/5 flex items-center justify-between text-sm text-slate-400">
            <span>Page {page} of {totalPages}</span>
            <div className="flex space-x-2">
              <button 
                disabled={page === 1} 
                onClick={() => setPage(p => p - 1)}
                className="px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-50"
              >
                Prev
              </button>
              <button 
                disabled={page === totalPages} 
                onClick={() => setPage(p => p + 1)}
                className="px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>

        {/* Side Panels */}
        <div className="space-y-8">
          
          {/* Recent Signups */}
          <div className="glass rounded-3xl p-6 border border-white/5">
            <h2 className="font-bold text-white text-lg flex items-center space-x-2 mb-4">
              <Activity size={20} className="text-emerald-400" />
              <span>Recent Signups</span>
            </h2>
            <div className="space-y-4">
              {recentSignups.map((org) => (
                <div key={org.id} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-300">
                      {org.name[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white truncate max-w-[120px]">{org.name}</p>
                      <p className="text-[10px] text-slate-500">{new Date(org.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                    org.plan === 'mega' ? 'bg-purple-500/20 text-purple-400' : 
                    org.plan === 'pro' ? 'bg-blue-500/20 text-blue-400' : 
                    'bg-slate-500/20 text-slate-400'
                  }`}>
                    {org.plan}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Top Organizations */}
          <div className="glass rounded-3xl p-6 border border-white/5">
            <h2 className="font-bold text-white text-lg flex items-center space-x-2 mb-4">
              <Star size={20} className="text-amber-400" />
              <span>Top Organizations</span>
            </h2>
            <div className="space-y-4">
              {topOrgs.map((org, i) => (
                <div key={org.id} className="flex items-center space-x-3">
                  <span className="text-slate-500 font-mono text-xs w-4">{i + 1}.</span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-white">{org.name}</p>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full mt-1.5 overflow-hidden">
                      <div 
                        className="bg-blue-500 h-full rounded-full" 
                        style={{ width: `${Math.min((org.query_count / 1000) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-white">{org.query_count}</p>
                    <p className="text-[9px] text-slate-500 uppercase">Queries</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
        </div>
        </>
        )}
      </div>
    </div>
  );
};

export default SuperAdminDashboard;
