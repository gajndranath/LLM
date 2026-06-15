import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import { toast } from 'sonner';

if (import.meta.env.PROD && !import.meta.env.VITE_API_URL) {
  throw new Error("❌ BUILD ERROR: VITE_API_URL environment variable is required in production mode!");
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
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

    // Extract message from our ApiError format
    const errorMessage = error.response?.data?.message || error.message || 'An unexpected error occurred';
    
    // Create a new error with the extracted message so catch blocks get it
    const enhancedError = new Error(errorMessage);
    (enhancedError as any).response = error.response;
    
    return Promise.reject(enhancedError);
  }
);
