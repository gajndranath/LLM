import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import QueryPage from './pages/QueryPage';
import ConnectionsPage from './pages/ConnectionsPage';
import ArchitectPage from './pages/ArchitectPage';
import DesignStudio from './pages/DesignStudio';
import MainLayout from './layouts/MainLayout';

function App() {
  const { isAuthenticated } = useAuthStore();

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/" />} />
      <Route path="/register" element={!isAuthenticated ? <Register /> : <Navigate to="/" />} />

      {/* Protected Routes */}
      <Route element={isAuthenticated ? <MainLayout /> : <Navigate to="/login" />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/query" element={<QueryPage />} />
        <Route path="/connections" element={<ConnectionsPage />} />
        <Route path="/architect" element={<ArchitectPage />} />
        <Route path="/design-studio" element={<DesignStudio />} />
      </Route>

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default App;
