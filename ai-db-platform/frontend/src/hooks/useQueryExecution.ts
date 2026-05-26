import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryApi } from '../api/query.api';

export const useQueryExecution = (connectionId: string | null) => {
  const queryClient = useQueryClient();

  const historyQuery = useQuery({
    queryKey: ['history', connectionId],
    queryFn: async () => {
      const res = await queryApi.getHistory(connectionId || undefined);
      return res.data;
    },
  });

  const generateMutation = useMutation({
    mutationFn: (payload: { connectionId: string; prompt: string; schema_context?: string }) =>
      queryApi.generateQuery(payload),
  });

  const executeMutation = useMutation({
    mutationFn: (payload: { connectionId: string; query: string; confirmWrite?: boolean }) =>
      queryApi.executeQuery(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['history'] });
    },
  });

  const optimizeMutation = useMutation({
    mutationFn: (payload: { connectionId: string; query: string }) =>
      queryApi.optimizeQuery(payload),
  });

  return {
    historyQuery,
    generateMutation,
    executeMutation,
    optimizeMutation,
  };
};
