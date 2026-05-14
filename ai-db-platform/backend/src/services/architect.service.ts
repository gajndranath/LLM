import axios from 'axios';
import { env } from '../config/env';
import { ApiError } from '../utils/ApiError';

export interface ArchitectureReviewInput {
  schemaContext: string;
  requirements?: string;
  scale?: string;
  historyContext?: string; // NEW: Past audit summaries
}

const aiClient = axios.create({
  baseURL: env.AI_SERVICE_URL,
  timeout: 120000, // 120s for deep architectural analysis
  headers: {
    'Content-Type': 'application/json',
    'X-Internal-Secret': env.AI_SERVICE_SECRET,
  },
});

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

export const generateSchemaVisuals = async (schemaContext: string) => {
  try {
    const response = await aiClient.post('/generate-schema-visuals', {
      schema_context: schemaContext,
    });
    return response.data;
  } catch (error: any) {
    const message = error.response?.data?.detail || error.message;
    throw new ApiError(error.response?.status || 500, `AI Visuals Error: ${message}`);
  }
};
