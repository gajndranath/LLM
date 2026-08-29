import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import ErrorBoundary from '../components/ErrorBoundary';

const MainLayout = () => {
  const location = useLocation();
  const isFullWindow = location.pathname.startsWith('/architect') || location.pathname.startsWith('/query');

  return (
    <div className="flex h-screen w-screen overflow-hidden text-slate-100 bg-[#080d1a] p-3 md:p-4 gap-3 md:gap-4 box-border font-sans selection:bg-blue-500/30 selection:text-blue-200">
      {/* 1. Global Left Sidebar - Stable across entire app */}
      <Sidebar />

      {/* 2. Main Container Card - Everything renders inside this unified dark glass window */}
      <main className="flex-1 min-w-0 h-full flex flex-col rounded-3xl md:rounded-[2rem] overflow-hidden bg-[#0c1324]/80 backdrop-blur-xl border border-white/8 shadow-2xl shadow-black/50 relative">
        {/* Background ambient glow accents */}
        <div className="absolute top-0 right-0 -z-10 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-3xl opacity-30 pointer-events-none" />
        <div className="absolute bottom-0 left-0 -z-10 w-[450px] h-[450px] bg-purple-600/10 rounded-full blur-3xl opacity-30 pointer-events-none" />

        {/* Dynamic Content Container */}
        <div className={`flex-1 min-h-0 flex flex-col ${isFullWindow ? 'p-0 overflow-hidden' : 'p-6 md:p-8 overflow-y-auto scrollbar-none'}`}>
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </div>
      </main>
    </div>
  );
};

export default MainLayout;
