import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Database,
  Terminal,
  LogOut,
  Wand2,
  Users,
  CreditCard,
  Building2,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { authApi } from '../api/auth.api';

const Sidebar = () => {
  const logout = useAuthStore((state) => state.logout);

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch (e) {
      console.error(e);
    } finally {
      logout();
    }
  };
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

  const baseNavItems = [
    { name: 'Dashboard',    icon: LayoutDashboard, path: '/dashboard',  color: 'blue' },
    { name: 'SQL Copilot',  icon: Terminal,        path: '/query',      color: 'blue' },
    { name: 'AI Architect', icon: Wand2,           path: '/architect',  color: 'purple' },
    { name: 'Connections',  icon: Database,        path: '/connections', color: 'blue' },
  ];

  const adminNavItems = [
    { name: 'Team',    icon: Users,       path: '/team',    color: 'emerald' },
    { name: 'Billing', icon: CreditCard,  path: '/billing', color: 'amber' },
  ];

  const navItems = isAdmin ? [...baseNavItems, ...adminNavItems] : baseNavItems;

  const orgName = user?.organizationName;

  return (
    <aside className="w-64 glass flex flex-col h-full m-4 rounded-3xl overflow-hidden shadow-2xl">
      {/* Brand */}
      <div className="p-8">
        <div className="flex items-center space-x-2 mb-1">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-500 to-emerald-400 flex items-center justify-center">
            <Database size={16} className="text-white" />
          </div>
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400 tracking-wider">
            ATLAS
          </h1>
        </div>
        <p className="text-[10px] text-slate-500 uppercase tracking-[0.2em] font-medium ml-10">AI Database</p>
      </div>

      {/* Org name badge for ADMIN */}
      {orgName && (
        <div className="mx-4 mb-2 px-3 py-2 bg-blue-500/10 border border-blue-500/20 rounded-xl">
          <div className="flex items-center space-x-2">
            <Building2 size={12} className="text-blue-400 flex-shrink-0" />
            <p className="text-[11px] text-blue-300 font-medium truncate">{orgName}</p>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) => {
              const colorMap: Record<string, string> = {
                purple: isActive ? 'bg-purple-500/10 text-purple-400 shadow-[inset_0_0_20px_rgba(168,85,247,0.1)]' : 'text-slate-400 hover:bg-white/5 hover:text-slate-100',
                emerald: isActive ? 'bg-emerald-500/10 text-emerald-400 shadow-[inset_0_0_20px_rgba(52,211,153,0.1)]' : 'text-slate-400 hover:bg-white/5 hover:text-slate-100',
                amber: isActive ? 'bg-amber-500/10 text-amber-400 shadow-[inset_0_0_20px_rgba(251,191,36,0.1)]' : 'text-slate-400 hover:bg-white/5 hover:text-slate-100',
                blue: isActive ? 'bg-blue-500/10 text-blue-400 shadow-[inset_0_0_20px_rgba(59,130,246,0.1)]' : 'text-slate-400 hover:bg-white/5 hover:text-slate-100',
              };
              return `flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${colorMap[item.color]}`;
            }}
          >
            <item.icon size={18} />
            <span className="font-medium text-sm">{item.name}</span>
          </NavLink>
        ))}
      </nav>

      {/* User footer */}
      <div className="p-6 border-t border-white/5">
        <div className="flex items-center space-x-3 mb-5 px-1">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-emerald-500 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-blue-500/20 flex-shrink-0">
            {user?.name?.[0].toUpperCase() || 'U'}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-semibold truncate">{user?.name}</p>
            <p className="text-[10px] text-slate-500 truncate uppercase tracking-wider">{user?.role}</p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all duration-200"
        >
          <LogOut size={18} />
          <span className="font-medium text-sm">Sign Out</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
