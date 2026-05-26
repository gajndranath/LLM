import { api } from './axiosInstance';
import type { ApiResponse, AuthResponse } from '../types/api.types';

export const authApi = {
  sendOtp: async (email: string): Promise<ApiResponse<null>> => {
    const { data } = await api.post('/auth/send-otp', { email });
    return data;
  },

  register: async (payload: any): Promise<ApiResponse<AuthResponse>> => {
    const { data } = await api.post('/auth/register', payload);
    return data;
  },

  login: async (payload: any): Promise<ApiResponse<AuthResponse>> => {
    const { data } = await api.post('/auth/login', payload);
    return data;
  },
};
