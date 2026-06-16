import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import { toast } from 'sonner';

if (import.meta.env.PROD && !import.meta.env.VITE_API_URL) {
  console.warn("VITE_API_URL is missing, falling back to Render Production URL.");
}

const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const defaultApiUrl = isLocalhost ? 'http://localhost:3001/api' : 'https://llm-3qnu.onrender.com/api';
const API_BASE_URL = import.meta.env.VITE_API_URL || defaultApiUrl;

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const user = useAuthStore.getState().user;
  if (user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN') {
    config.headers['x-bypass-maintenance'] = 'true';
  }
  return config;
});

api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Handle session expiry
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (originalRequest.url !== '/auth/login' && originalRequest.url !== '/auth/me') {
        const wasAuthenticated = useAuthStore.getState().isAuthenticated;
        useAuthStore.getState().logout();
        if (wasAuthenticated) {
          toast.error("Session expired. Please login again.");
        }
      } else if (originalRequest.url === '/auth/me') {
        useAuthStore.getState().logout();
      }
    }

    // Handle Maintenance Mode
    if (error.response?.status === 503 && error.response?.data?.message?.includes('maintenance')) {
      if (window.location.pathname !== '/maintenance') {
        window.location.href = '/maintenance';
      }
    }

    // Extract message from our ApiError format
    const errorMessage = error.response?.data?.message || error.message || 'An unexpected error occurred';
    
    // Create a new error with the extracted message so catch blocks get it
    const enhancedError = new Error(errorMessage);
    (enhancedError as any).response = error.response;
    
    return Promise.reject(enhancedError);
  }
);
