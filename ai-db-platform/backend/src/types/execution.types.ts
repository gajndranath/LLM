export interface ExecutionResult {
  rows: Record<string, unknown>[];
  rowCount: number;
  fields: { name: string; dataTypeID: number }[];
  executionMs: number;
  truncated: boolean;
}

export interface ExplainResult {
  plan: unknown[];
  totalCost: number;
  actualTime: number;
  hasSeqScan: boolean;
  warnings: string[];
}

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
