import { useEffect, Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { authApi } from './api/auth.api';
import { useMaintenanceSocket } from './hooks/useMaintenanceSocket';

const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const OrgRegister = lazy(() => import('./pages/OrgRegister'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const QueryPage = lazy(() => import('./pages/QueryPage'));
const ConnectionsPage = lazy(() => import('./pages/ConnectionsPage'));
const ArchitectStudio = lazy(() => import('./pages/ArchitectStudio'));
const SchemaDriftPage = lazy(() => import('./pages/SchemaDriftPage'));
const SuperAdminDashboard = lazy(() => import('./pages/SuperAdminDashboard'));
const TeamManagementPage = lazy(() => import('./pages/TeamManagementPage'));
const BillingPage = lazy(() => import('./pages/BillingPage'));
const InviteAcceptPage = lazy(() => import('./pages/InviteAcceptPage'));
const LandingPage = lazy(() => import('./pages/LandingPage'));
const MaintenancePage = lazy(() => import('./pages/MaintenancePage'));
const MainLayout = lazy(() => import('./layouts/MainLayout'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const TermsOfService = lazy(() => import('./pages/TermsOfService'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const DocumentationPage = lazy(() => import('./pages/DocumentationPage'));
const FeaturesPage = lazy(() => import('./pages/FeaturesPage'));

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
        setAuth(res.data.user);
      } catch (err: any) {
        logout();
      }
    };
    initAuth();
  }, [setAuth, logout]);

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
        <p className="text-slate-400 font-medium tracking-wide">Initializing Enterprise Vault...</p>
      </div>
    );
  }

  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
        <p className="text-slate-400 font-medium tracking-wide">Loading workspace...</p>
      </div>
    }>
      <Routes>
        {/* ── Public Routes ─────────────────────────────────── */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/features" element={<FeaturesPage />} />
        <Route path="/docs" element={<DocumentationPage />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsOfService />} />
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
          <Route path="/schema-drift" element={<SchemaDriftPage />} />
          {/* Admin-only routes */}
          <Route path="/team" element={isAdmin ? <TeamManagementPage /> : <Navigate to="/dashboard" />} />
          <Route path="/billing" element={isAdmin ? <BillingPage /> : <Navigate to="/dashboard" />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>

        {/* Catch all 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}

export default App;
