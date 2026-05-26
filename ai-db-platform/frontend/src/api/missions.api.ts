import { api } from './axiosInstance';
import type { ApiResponse, Mission } from '../types/api.types';

export const missionsApi = {
  getActiveMissions: async (connectionId: string): Promise<ApiResponse<Mission[]>> => {
    const { data } = await api.get(`/missions/active?connectionId=${connectionId}`);
    return data;
  },

  updateMissionStatus: async (id: string, status: Mission['status']): Promise<ApiResponse<Mission>> => {
    const { data } = await api.patch(`/missions/${id}/status`, { status });
    return data;
  },
};
