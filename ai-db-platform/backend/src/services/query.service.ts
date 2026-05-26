import { aiClient } from './aiClient';
import { ApiError } from '../utils/ApiError';

import { GenerateSQLInput, GenerateSQLResult, OptimizeQueryInput, OptimizeQueryResult } from '../types/execution.types';

// ── Generate SQL ───────────────────────────────────────────
export const generateSQL = async (input: GenerateSQLInput): Promise<GenerateSQLResult> => {
  try {
    const response = await aiClient.post('/generate-sql', {
      natural_query: input.naturalQuery,
      schema_context: input.schemaContext,
      dialect: input.dialect || 'postgres',
    });
    return response.data;
  } catch (error: any) {
    const message = error.response?.data?.detail || error.message;
    throw new ApiError(error.response?.status || 500, `AI Service Error: ${message}`);
  }
};

// ── Optimize Query ─────────────────────────────────────────
export const optimizeQuery = async (input: OptimizeQueryInput): Promise<OptimizeQueryResult> => {
  try {
    const response = await aiClient.post('/optimize-query', {
      sql: input.sql,
      schema_context: input.schemaContext,
      explain_plan: input.explainPlan || null,
    });
    return response.data;
  } catch (error: any) {
    const message = error.response?.data?.detail || error.message;
    throw new ApiError(error.response?.status || 500, `AI Service Error: ${message}`);
  }
};

// ── Generate Insights ──────────────────────────────────────
export const generateInsights = async (query: string, results: any[], schemaContext: string = "") => {
  try {
    const response = await aiClient.post('/generate-insights', {
      query,
      results,
      schema_context: schemaContext,
    });
    return response.data;
  } catch (error: any) {
    const message = error.response?.data?.detail || error.message;
    throw new ApiError(error.response?.status || 500, `AI Service Error: ${message}`);
  }
};

// ── Health check for AI service ────────────────────────────
export const checkAIServiceHealth = async (): Promise<boolean> => {
  try {
    const response = await aiClient.get('/health', { timeout: 5000 });
    return response.status === 200;
  } catch {
    return false;
  }
};
