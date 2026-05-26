import { api } from './axiosInstance';
import type { ApiResponse, ArchitectAudit } from '../types/api.types';

export const architectApi = {
  getHistory: async (connectionId?: string): Promise<ApiResponse<ArchitectAudit[]>> => {
    const url = connectionId ? `/architect/history?connectionId=${connectionId}` : '/architect/history';
    const { data } = await api.get(url);
    return data;
  },

  deleteAudit: async (id: string): Promise<ApiResponse<null>> => {
    const { data } = await api.delete(`/architect/history/${id}`);
    return data;
  },

  reviewArchitecture: async (payload: { connectionId: string; scale?: string }): Promise<ApiResponse<any>> => {
    const { data } = await api.post('/architect/review', payload);
    return data;
  },

  getMutations: async (connectionId: string): Promise<ApiResponse<any[]>> => {
    const { data } = await api.get(`/architect/mutations?connectionId=${connectionId}`);
    return data;
  },

  applyFix: async (payload: {
    connectionId: string;
    title: string;
    description: string;
    sql: string;
    rollbackSql?: string | null;
    confirmWrite: boolean;
  }): Promise<ApiResponse<any>> => {
    const { data } = await api.post('/architect/apply-fix', payload);
    return data;
  },

  rollbackFix: async (mutationId: string): Promise<ApiResponse<any>> => {
    const { data } = await api.post('/architect/rollback-fix', { mutationId });
    return data;
  },
};
