import { useQuery } from '@tanstack/react-query';
import { connectionsApi } from '../api/connections.api';

export const useSchemaExtract = (connectionId: string | null, includeVisuals = false) => {
  return useQuery({
    queryKey: ['schema', connectionId, includeVisuals],
    queryFn: async () => {
      if (!connectionId) return null;
      const res = await connectionsApi.getConnectionSchema(connectionId, includeVisuals);
      return res.data;
    },
    enabled: !!connectionId,
  });
};
