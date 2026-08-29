import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import ErrorBoundary from '../components/ErrorBoundary';

const MainLayout = () => {
  const location = useLocation();
  const isFullWindow = location.pathname.startsWith('/architect') || location.pathname.startsWith('/query');

  return (
    <div className="flex h-screen w-screen overflow-hidden text-slate-100 bg-[#080d1a] p-0 md:p-4 gap-0 md:gap-4 box-border font-sans selection:bg-blue-500/30 selection:text-blue-200 relative">
      {/* 1. Global Left Sidebar - Drawer on Mobile, Stable Rail on Desktop */}
      <Sidebar />

      {/* 2. Main Container Card - Edge-to-edge on Mobile, Floating Glass Shell on Desktop */}
      <main className="flex-1 min-w-0 h-full flex flex-col rounded-none md:rounded-[2rem] overflow-hidden bg-[#0c1324]/90 md:bg-[#0c1324]/80 backdrop-blur-xl border-0 md:border md:border-white/8 shadow-2xl shadow-black/50 relative">
        {/* Background ambient glow accents */}
        <div className="absolute top-0 right-0 -z-10 w-[300px] md:w-[500px] h-[300px] md:h-[500px] bg-blue-600/10 rounded-full blur-3xl opacity-30 pointer-events-none" />
        <div className="absolute bottom-0 left-0 -z-10 w-[250px] md:w-[450px] h-[250px] md:h-[450px] bg-purple-600/10 rounded-full blur-3xl opacity-30 pointer-events-none" />

        {/* Dynamic Content Container - with mobile top clearance for hamburger button */}
        <div className={`flex-1 min-h-0 flex flex-col ${isFullWindow ? 'p-0 overflow-hidden' : 'pt-16 pb-6 px-4 md:p-8 overflow-y-auto scrollbar-none'}`}>
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </div>
      </main>
    </div>
  );
};

export default MainLayout;
