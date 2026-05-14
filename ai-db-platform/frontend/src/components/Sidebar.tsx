import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Database,
  Terminal,
  LogOut,
  Wand2
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';

const Sidebar = () => {
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);

  const navItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/', color: 'blue' },
    { name: 'SQL Copilot', icon: Terminal, path: '/query', color: 'blue' },
    { name: 'AI Architect', icon: Wand2, path: '/architect', color: 'purple' },
    { name: 'Connections', icon: Database, path: '/connections', color: 'blue' },
  ];

  return (
    <aside className="w-64 glass flex flex-col h-full m-4 rounded-3xl overflow-hidden shadow-2xl">
      <div className="p-8">
        <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400 tracking-wider">
          AI ARCHITECT
        </h1>
        <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-[0.2em] font-medium">Enterprise Database</p>
      </div>

      <nav className="flex-1 px-4 space-y-2">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-300 ${isActive
                ? item.color === 'purple'
                  ? 'bg-purple-500/10 text-purple-400 shadow-[inset_0_0_20px_rgba(168,85,247,0.1)]'
                  : 'bg-blue-500/10 text-blue-400 shadow-[inset_0_0_20px_rgba(59,130,246,0.1)]'
                : 'text-slate-400 hover:bg-white/5 hover:text-slate-100'
              }`
            }
          >
            <item.icon size={20} />
            <span className="font-medium">{item.name}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-6 border-t border-white/5">
        <div className="flex items-center space-x-3 mb-6 px-2">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-emerald-500 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-blue-500/20">
            {user?.name?.[0].toUpperCase() || 'U'}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-semibold truncate">{user?.name}</p>
            <p className="text-[10px] text-slate-500 truncate uppercase tracking-wider">{user?.role}</p>
          </div>
        </div>

        <button
          onClick={logout}
          className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all duration-300"
        >
          <LogOut size={20} />
          <span className="font-medium">Sign Out</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
