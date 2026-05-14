import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import { toast } from 'sonner';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
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
      if (originalRequest.url !== '/auth/login') {
        useAuthStore.getState().logout();
        toast.error("Session expired. Please login again.");
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
