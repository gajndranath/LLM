import { create } from 'zustand';
// No longer using persist

export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'ANALYST' | 'VIEWER' | 'DISPATCHER' | 'DRIVER';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  organizationId?: string;
  organizationName?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
  setAuth: (user: User) => void;
  logout: () => void;
  isSuperAdmin: () => boolean;
  isAdmin: () => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isInitialized: false,
  setAuth: (user) => set({ user, isAuthenticated: true, isInitialized: true }),
  logout: () => set({ user: null, isAuthenticated: false, isInitialized: true }),
  isSuperAdmin: () => get().user?.role === 'SUPER_ADMIN',
  isAdmin: () => {
    const role = get().user?.role;
    return role === 'ADMIN' || role === 'SUPER_ADMIN';
  },
}));
