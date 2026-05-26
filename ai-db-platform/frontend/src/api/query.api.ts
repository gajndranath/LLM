import { api } from './axiosInstance';
import type { ApiResponse, QueryHistoryItem } from '../types/api.types';

export const queryApi = {
  getHistory: async (connectionId?: string, limit?: number): Promise<ApiResponse<QueryHistoryItem[]>> => {
    let url = '/query/history';
    const params: string[] = [];
    if (connectionId) params.push(`connectionId=${connectionId}`);
    if (limit) params.push(`limit=${limit}`);
    if (params.length > 0) {
      url += `?${params.join('&')}`;
    }
    const { data } = await api.get(url);
    return data;
  },

  generateQuery: async (payload: { connectionId: string; prompt: string; schema_context?: string }): Promise<ApiResponse<{ sql: string; explanation?: string; warnings?: string[]; chart_recommendation?: any }>> => {
    const { data } = await api.post('/query/generate', payload);
    return data;
  },

  executeQuery: async (payload: { connectionId: string; query: string; confirmWrite?: boolean }): Promise<ApiResponse<any>> => {
    const { data } = await api.post('/query/execute', payload);
    return data;
  },

  getInsights: async (payload: { connectionId: string; query: string; results: any[] }): Promise<ApiResponse<any>> => {
    const { data } = await api.post('/query/insights', payload);
    return data;
  },

  optimizeQuery: async (payload: { connectionId: string; query: string }): Promise<ApiResponse<any>> => {
    const { data } = await api.post('/query/optimize', payload);
    return data;
  },

  getTableData: async (connectionId: string, tableName: string, options: { limit: number; offset: number; search?: string }): Promise<ApiResponse<any>> => {
    const searchParam = options.search ? `&search=${encodeURIComponent(options.search)}` : '';
    const { data } = await api.get(
      `/connections/${connectionId}/tables/${tableName}/data?limit=${options.limit}&offset=${options.offset}${searchParam}`
    );
    return data;
  },
};
