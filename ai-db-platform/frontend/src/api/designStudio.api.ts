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

  probeSession: async (payload: { sessionId: string; userMessage: string; provider?: string; model?: string }): Promise<ApiResponse<any>> => {
    const { data } = await api.post('/design-studio/probe', payload);
    return data;
  },

  generateSchema: async (payload: { sessionId: string; provider?: string; model?: string }): Promise<ApiResponse<any>> => {
    const { data } = await api.post('/design-studio/generate-schema', payload);
    return data;
  },

  deploySchema: async (payload: { sessionId: string; connectionId: string }): Promise<ApiResponse<any>> => {
    const { data } = await api.post('/design-studio/deploy', payload);
    return data;
  },

  auditExisting: async (payload: { sessionId?: string | null; connectionId: string; userConcerns?: string | null; provider?: string; model?: string }): Promise<ApiResponse<any>> => {
    const { data } = await api.post('/design-studio/audit-existing', payload);
    return data;
  },

  clearSchemaCache: async (connectionId: string): Promise<ApiResponse<null>> => {
    const { data } = await api.delete(`/design-studio/schema-cache?connectionId=${connectionId}`);
    return data;
  },

  getMutations: async (connectionId: string): Promise<ApiResponse<any[]>> => {
    const { data } = await api.get(`/design-studio/mutations?connectionId=${connectionId}`);
    return data;
  },

  rollbackMutation: async (mutationId: string, connectionId: string): Promise<ApiResponse<null>> => {
    const { data } = await api.post(`/design-studio/mutations/${mutationId}/rollback`, { connectionId });
    return data;
  },
};
