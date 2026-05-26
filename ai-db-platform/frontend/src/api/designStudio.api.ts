import { api } from './axiosInstance';
import type { ApiResponse, DesignStudioSession } from '../types/api.types';

export const designStudioApi = {
  getSessions: async (): Promise<ApiResponse<DesignStudioSession[]>> => {
    const { data } = await api.get('/design-studio/sessions');
    return data;
  },

  deleteSession: async (id: string): Promise<ApiResponse<null>> => {
    const { data } = await api.delete(`/design-studio/sessions/${id}`);
    return data;
  },

  createSession: async (payload: { mode: 'new' | 'existing'; connectionId?: string }): Promise<ApiResponse<DesignStudioSession>> => {
    const { data } = await api.post('/design-studio/sessions', payload);
    return data;
  },

  probeSession: async (payload: { sessionId: string; userMessage: string }): Promise<ApiResponse<any>> => {
    const { data } = await api.post('/design-studio/probe', payload);
    return data;
  },

  generateSchema: async (sessionId: string): Promise<ApiResponse<any>> => {
    const { data } = await api.post('/design-studio/generate-schema', { sessionId });
    return data;
  },

  deploySchema: async (payload: { sessionId: string; connectionId: string }): Promise<ApiResponse<any>> => {
    const { data } = await api.post('/design-studio/deploy', payload);
    return data;
  },

  auditExisting: async (payload: { sessionId?: string | null; connectionId: string; userConcerns?: string | null }): Promise<ApiResponse<any>> => {
    const { data } = await api.post('/design-studio/audit-existing', payload);
    return data;
  },
};
