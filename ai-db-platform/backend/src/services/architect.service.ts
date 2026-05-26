import { aiClient } from './aiClient';
import { ApiError } from '../utils/ApiError';

export interface ArchitectureReviewInput {
  schemaContext: string;
  requirements?: string;
  scale?: string;
  historyContext?: string; // NEW: Past audit summaries
}

export const analyzeArchitecture = async (input: ArchitectureReviewInput) => {
  try {
    const response = await aiClient.post('/analyze-architecture', {
      schema_context: input.schemaContext,
      requirements: input.requirements,
      expected_scale: input.scale || '1M rows',
      history_context: input.historyContext || '',
    });
    return response.data;
  } catch (error: any) {
    const message = error.response?.data?.detail || error.message;
    throw new ApiError(error.response?.status || 500, `Architect AI Error: ${message}`);
  }
};
