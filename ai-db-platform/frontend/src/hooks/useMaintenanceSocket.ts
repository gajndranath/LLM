import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { toast } from 'sonner';
import { useAuthStore } from '../store/authStore';

const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const SOCKET_URL = isLocalhost ? 'http://localhost:3001' : 'https://llm-3qnu.onrender.com';

let socket: Socket | null = null;

export function useMaintenanceSocket() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  useEffect(() => {
    // Connect socket once
    if (!socket) {
      socket = io(SOCKET_URL, { withCredentials: true, transports: ['websocket', 'polling'] });
    }

    const handleMaintenanceToggle = ({ isMaintenance }: { isMaintenance: boolean }) => {
      if (isMaintenance) {
        // Super Admins are never kicked out
        if (isSuperAdmin) {
          toast.warning('⚠️ Maintenance Mode is now ON. Users have been locked out.');
          return;
        }
        // Normal users get redirected immediately
        toast.error('🔧 Platform is going into maintenance. Please wait...');
        setTimeout(() => navigate('/maintenance'), 1500);
      } else {
        // Maintenance is OFF — everyone on /maintenance page gets redirected back
        if (location.pathname === '/maintenance') {
          toast.success('✅ Maintenance complete! Redirecting you back...');
          setTimeout(() => navigate('/dashboard'), 1500);
        }
      }
    };

    socket.on('maintenance_toggle', handleMaintenanceToggle);

    return () => {
      socket?.off('maintenance_toggle', handleMaintenanceToggle);
    };
  }, [isSuperAdmin, navigate, location.pathname]);
}
