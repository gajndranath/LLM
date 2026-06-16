import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { authApi } from './api/auth.api';
import Login from './pages/Login';
import Register from './pages/Register';
import OrgRegister from './pages/OrgRegister';
import Dashboard from './pages/Dashboard';
import QueryPage from './pages/QueryPage';
import ConnectionsPage from './pages/ConnectionsPage';
import ArchitectStudio from './pages/ArchitectStudio';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import TeamManagementPage from './pages/TeamManagementPage';
import BillingPage from './pages/BillingPage';
import InviteAcceptPage from './pages/InviteAcceptPage';
import LandingPage from './pages/LandingPage';
import MaintenancePage from './pages/MaintenancePage';
import MainLayout from './layouts/MainLayout';
import { useMaintenanceSocket } from './hooks/useMaintenanceSocket';

function App() {
  const { isAuthenticated, isInitialized, user, setAuth, logout } = useAuthStore();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

  // Real-time maintenance mode listener via Socket.io
  useMaintenanceSocket();

  useEffect(() => {
    const initAuth = async () => {
      try {
        const res = await authApi.me();
        if (res && res.data && res.data.user) {
          setAuth(res.data.user);
        } else {
          logout();
        }
      } catch (err) {
        logout();
      }
    };
    if (!isInitialized) {
      initAuth();
    }
  }, [isInitialized, setAuth, logout]);

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#020617]">
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <Routes>
      {/* ── Public Routes ─────────────────────────────────── */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={!isAuthenticated ? <Login /> : isSuperAdmin ? <Navigate to="/super-admin" /> : <Navigate to="/dashboard" />} />
      <Route path="/register" element={!isAuthenticated ? <Register /> : <Navigate to="/dashboard" />} />
      <Route path="/register-org" element={!isAuthenticated ? <OrgRegister /> : <Navigate to="/dashboard" />} />
      <Route path="/invite/:token" element={<InviteAcceptPage />} />
      <Route path="/maintenance" element={<MaintenancePage />} />

      {/* ── SUPER_ADMIN Only Routes ───────────────────────── */}
      <Route
        path="/super-admin"
        element={isAuthenticated && isSuperAdmin ? <SuperAdminDashboard /> : <Navigate to="/login" />}
      />

      {/* ── Regular Protected Routes (org users) ─────────── */}
      <Route element={
        isAuthenticated && !isSuperAdmin
          ? <MainLayout />
          : isAuthenticated && isSuperAdmin
          ? <Navigate to="/super-admin" />
          : <Navigate to="/login" />
      }>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/query" element={<QueryPage />} />
        <Route path="/connections" element={<ConnectionsPage />} />
        <Route path="/architect" element={<ArchitectStudio />} />
        {/* Admin-only routes */}
        <Route path="/team" element={isAdmin ? <TeamManagementPage /> : <Navigate to="/dashboard" />} />
        <Route path="/billing" element={isAdmin ? <BillingPage /> : <Navigate to="/dashboard" />} />
      </Route>

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default App;
