import { api } from './axiosInstance';
import type { ApiResponse, DbConnection, SchemaContext } from '../types/api.types';

export const connectionsApi = {
  getConnections: async (): Promise<ApiResponse<DbConnection[]>> => {
    const { data } = await api.get('/connections');
    return data;
  },

  getConnectionSchema: async (id: string, includeVisuals = false): Promise<ApiResponse<SchemaContext>> => {
    const { data } = await api.get(`/connections/${id}/schema${includeVisuals ? '?includeVisuals=true' : ''}`);
    return data;
  },

  deleteConnection: async (id: string): Promise<ApiResponse<null>> => {
    const { data } = await api.delete(`/connections/${id}`);
    return data;
  },

  testConnection: async (id: string): Promise<ApiResponse<{ message: string }>> => {
    const { data } = await api.get(`/connections/${id}/test`);
    return data;
  },

  createConnection: async (payload: any): Promise<ApiResponse<DbConnection>> => {
    const { data } = await api.post('/connections', payload);
    return data;
  },
};
