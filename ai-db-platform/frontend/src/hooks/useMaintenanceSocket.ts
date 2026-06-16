import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { toast } from 'sonner';
import { useAuthStore } from '../store/authStore';
import { api } from '../api/axiosInstance';

const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const SOCKET_URL = isLocalhost ? 'http://localhost:3001' : 'https://llm-3qnu.onrender.com';

// Module-level singleton so we don't create multiple connections
let socket: Socket | null = null;

function getSocket(): Socket {
  if (!socket || !socket.connected) {
    socket = io(SOCKET_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
    });
  }
  return socket;
}

export function useMaintenanceSocket() {
  const { user, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const checkedRef = useRef(false);

  // ── 1. INITIAL CHECK on mount / login ──────────────────────────
  // When app loads or user changes, immediately check maintenance status
  // so user doesn't need to reload to see the maintenance page
  useEffect(() => {
    if (!isAuthenticated || isSuperAdmin) return;
    if (checkedRef.current) return;
    checkedRef.current = true;

    const checkInitialMaintenance = async () => {
      try {
        const res = await api.get('/super-admin/maintenance');
        const isMaintenance = res.data?.data?.isMaintenance;
        if (isMaintenance && location.pathname !== '/maintenance') {
          navigate('/maintenance', { replace: true });
        }
      } catch {
        // Ignore — if API fails, don't block the user
      }
    };

    checkInitialMaintenance();
  }, [isAuthenticated, isSuperAdmin, navigate, location.pathname]);

  // Reset the check flag when user logs out so next login re-checks
  useEffect(() => {
    if (!isAuthenticated) {
      checkedRef.current = false;
    }
  }, [isAuthenticated]);

  // ── 2. REAL-TIME via Socket.io ──────────────────────────────────
  useEffect(() => {
    const sock = getSocket();

    const handleMaintenanceToggle = ({ isMaintenance }: { isMaintenance: boolean }) => {
      if (isMaintenance) {
        if (isSuperAdmin) {
          toast.warning('⚠️ Maintenance ON — Users are now locked out.', { duration: 4000 });
          return;
        }
        toast.error('🔧 System going into maintenance...', { duration: 3000 });
        setTimeout(() => navigate('/maintenance', { replace: true }), 1000);
      } else {
        // Maintenance OFF — redirect everyone waiting on /maintenance
        if (location.pathname === '/maintenance') {
          toast.success('✅ Maintenance complete! Taking you back...', { duration: 3000 });
          setTimeout(() => navigate('/dashboard', { replace: true }), 1500);
        } else if (!isSuperAdmin) {
          toast.success('✅ System is back online!', { duration: 3000 });
        }
      }
    };

    sock.on('maintenance_toggle', handleMaintenanceToggle);

    return () => {
      sock.off('maintenance_toggle', handleMaintenanceToggle);
    };
  }, [isSuperAdmin, navigate, location.pathname]);
}
