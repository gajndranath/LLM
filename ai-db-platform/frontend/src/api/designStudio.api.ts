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

  truncateMessages: async (sessionId: string, index: number): Promise<ApiResponse<null>> => {
    const { data } = await api.delete(`/design-studio/sessions/${sessionId}/truncate-messages`, { data: { index } });
    return data;
  },

  generateSchema: async (
    payload: { sessionId: string; provider?: string; model?: string },
    onStatus?: (status: string) => void
  ): Promise<any> => {
    // We must use fetch instead of axios because axios doesn't support streaming responses easily in browsers
    const response = await fetch(`${api.defaults.baseURL}/design-studio/generate-schema`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      let errMessage = 'Blueprint generation failed';
      try {
        const errorData = await response.json();
        errMessage = errorData.message || errMessage;
      } catch (e) {
         // ignore
      }
      throw new Error(errMessage);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder('utf-8');

    if (!reader) throw new Error("No reader available from response");

    let finalSchema = null;
    let done = false;

    while (!done) {
      const { value, done: readerDone } = await reader.read();
      done = readerDone;
      if (value) {
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            let data;
            try {
              data = JSON.parse(line.substring(6));
            } catch (e) {
               continue; // ignore partial/invalid JSON
            }
            if (data.type === 'status') {
              if (onStatus) onStatus(data.message);
            } else if (data.type === 'error') {
              throw new Error(data.message);
            } else if (data.type === 'complete') {
              finalSchema = data.schema;
            }
          }
        }
      }
    }

    if (!finalSchema) {
      throw new Error("Failed to receive complete blueprint");
    }

    return finalSchema;
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
