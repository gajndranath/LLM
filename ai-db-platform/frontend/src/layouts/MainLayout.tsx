import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import ErrorBoundary from '../components/ErrorBoundary';

const MainLayout = () => {
  return (
    <div className="flex h-screen overflow-hidden text-slate-100 bg-slate-950">
      <Sidebar />
      <main className="flex-1 flex flex-col m-4 ml-0 rounded-[2.5rem] overflow-hidden glass-dark shadow-2xl relative">
        {/* Abstract background elements */}
        <div className="absolute top-0 right-0 -z-10 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl opacity-20 pointer-events-none" />
        <div className="absolute bottom-0 left-0 -z-10 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl opacity-20 pointer-events-none" />
        
        <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </div>
      </main>
    </div>
  );
};

export default MainLayout;
