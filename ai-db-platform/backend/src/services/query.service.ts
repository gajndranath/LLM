import axios, { AxiosError } from 'axios';
import { env } from '../config/env';
import { ApiError } from '../utils/ApiError';

export interface GenerateSQLInput {
  naturalQuery: string;
  schemaContext: string;
  connectionId: string;
  dialect?: string;
}

export interface GenerateSQLResult {
  sql: string;
  explanation: string;
  warnings: string[];
  provider: string;
  model: string;
  confidence: number;
}

export interface OptimizeQueryInput {
  sql: string;
  schemaContext: string;
  explainPlan?: unknown;
}

export interface OptimizeQueryResult {
  optimizedSql: string;
  issues: string[];
  suggestions: string[];
  indexRecommendations: string[];
}

const aiClient = axios.create({
  baseURL: env.AI_SERVICE_URL,
  timeout: 60000,  // 60s for AI calls
  headers: {
    'Content-Type': 'application/json',
    'X-Internal-Secret': env.AI_SERVICE_SECRET,
  },
});

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
export const generateInsights = async (query: string, results: any[]) => {
  try {
    const response = await aiClient.post('/generate-insights', {
      query,
      results,
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
