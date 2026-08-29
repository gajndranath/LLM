import { Link } from 'react-router-dom';
import { AlertTriangle, Home } from 'lucide-react';

const NotFoundPage = () => {
  return (
    <div className="min-h-screen bg-[#020617] text-white flex flex-col items-center justify-center p-6 text-center">
      <div className="w-20 h-20 bg-red-500/10 text-red-400 rounded-3xl flex items-center justify-center mb-6 animate-pulse">
        <AlertTriangle size={40} />
      </div>
      <h1 className="text-6xl font-black tracking-tight mb-2">404</h1>
      <h2 className="text-2xl font-bold text-slate-200 mb-4">Database Node Not Found</h2>
      <p className="text-slate-400 max-w-md text-sm mb-8 leading-relaxed">
        The route or database resource you are looking for has been moved, quarantined, or does not exist in this cluster.
      </p>
      <Link
        to="/dashboard"
        className="inline-flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white px-8 py-3.5 rounded-2xl font-bold text-xs shadow-xl shadow-blue-600/20 active:scale-95 transition-all"
      >
        <Home size={16} />
        <span>Return to Mission Control</span>
      </Link>
    </div>
  );
};

export default NotFoundPage;
