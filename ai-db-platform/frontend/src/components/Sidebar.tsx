import { useState } from 'react';
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
  ChevronLeft,
  ChevronRight,
  GitCompare,
  Settings,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { authApi } from '../api/auth.api';

const Sidebar = () => {
  const logout = useAuthStore((state) => state.logout);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('sidebar-collapsed') === 'true';
  });

  const toggleSidebar = () => {
    setIsCollapsed(prev => {
      const newVal = !prev;
      localStorage.setItem('sidebar-collapsed', String(newVal));
      return newVal;
    });
  };

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

  const baseNavItems = [
    { name: 'Dashboard',    icon: LayoutDashboard, path: '/dashboard',     color: 'blue' },
    { name: 'SQL Copilot',  icon: Terminal,        path: '/query',         color: 'blue' },
    { name: 'AI Architect', icon: Wand2,           path: '/architect',     color: 'purple' },
    { name: 'Schema Drift', icon: GitCompare,      path: '/schema-drift',  color: 'amber' },
    { name: 'Connections',  icon: Database,        path: '/connections',   color: 'blue' },
    { name: 'Team',         icon: Users,           path: '/team',          color: 'emerald' },
    { name: 'Billing',      icon: CreditCard,      path: '/billing',       color: 'amber' },
    { name: 'Settings',     icon: Settings,        path: '/settings',      color: 'purple' },
  ];

  const navItems = baseNavItems;
  const orgName = user?.organizationName;

  return (
    <aside className={`glass flex flex-col h-full rounded-2xl overflow-y-hidden shadow-2xl transition-all duration-300 flex-shrink-0 ${isCollapsed ? 'w-16' : 'w-56'}`}>
      {/* Brand */}
      <div className={`p-6 relative flex items-center justify-between ${isCollapsed ? 'flex-col space-y-4' : ''}`}>
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-500 to-emerald-400 flex items-center justify-center flex-shrink-0">
            <Database size={16} className="text-white" />
          </div>
          {!isCollapsed && (
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400 tracking-wider">
              ATLAS
            </h1>
          )}
        </div>
        
        {/* Toggle Button */}
        <button
          onClick={toggleSidebar}
          className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-all"
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      {!isCollapsed && orgName && (
        <div className="mx-4 mb-4 px-3 py-2 bg-blue-500/10 border border-blue-500/20 rounded-xl">
          <div className="flex items-center space-x-2">
            <Building2 size={12} className="text-blue-400 flex-shrink-0" />
            <p className="text-[11px] text-blue-300 font-medium truncate">{orgName}</p>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-4 space-y-1 overflow-y-auto scrollbar-none">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            title={isCollapsed ? item.name : undefined}
            className={({ isActive }) => {
              const colorMap: Record<string, string> = {
                purple: isActive ? 'bg-purple-500/10 text-purple-400 shadow-[inset_0_0_20px_rgba(168,85,247,0.1)]' : 'text-slate-400 hover:bg-white/5 hover:text-slate-100',
                emerald: isActive ? 'bg-emerald-500/10 text-emerald-400 shadow-[inset_0_0_20px_rgba(52,211,153,0.1)]' : 'text-slate-400 hover:bg-white/5 hover:text-slate-100',
                amber: isActive ? 'bg-amber-500/10 text-amber-400 shadow-[inset_0_0_20px_rgba(251,191,36,0.1)]' : 'text-slate-400 hover:bg-white/5 hover:text-slate-100',
                blue: isActive ? 'bg-blue-500/10 text-blue-400 shadow-[inset_0_0_20px_rgba(59,130,246,0.1)]' : 'text-slate-400 hover:bg-white/5 hover:text-slate-100',
              };
              return `flex items-center px-4 py-3 rounded-xl transition-all duration-200 ${isCollapsed ? 'justify-center' : 'space-x-3'} ${colorMap[item.color]}`;
            }}
          >
            <item.icon size={18} className="flex-shrink-0" />
            {!isCollapsed && <span className="font-medium text-sm">{item.name}</span>}
          </NavLink>
        ))}
      </nav>

      {/* User footer */}
      <div className="p-4 border-t border-white/5 space-y-3">
        <div className={`flex items-center px-1 ${isCollapsed ? 'justify-center' : 'space-x-3'}`}>
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-emerald-500 flex items-center justify-center text-white font-bold text-xs shadow-lg shadow-blue-500/20 flex-shrink-0">
            {user?.name?.[0].toUpperCase() || 'U'}
          </div>
          {!isCollapsed && (
            <div className="flex-grow overflow-hidden">
              <p className="text-xs font-semibold truncate text-white">{user?.name}</p>
              <p className="text-[9px] text-slate-500 truncate uppercase tracking-wider">{user?.role}</p>
            </div>
          )}
        </div>

        <button
          onClick={handleLogout}
          title={isCollapsed ? 'Sign Out' : undefined}
          className={`w-full flex items-center rounded-xl text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all duration-200 py-3 ${isCollapsed ? 'justify-center px-0' : 'px-4 space-x-3'}`}
        >
          <LogOut size={16} />
          {!isCollapsed && <span className="font-medium text-sm">Sign Out</span>}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
