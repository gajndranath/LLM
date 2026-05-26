export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export interface DbConnection {
  id: string;
  name: string;
  host: string;
  port: number;
  database: string;
  username: string;
  ssl: boolean;
  created_at: string;
}

export interface ConnectionInput {
  name: string;
  host: string;
  port: number;
  database: string;
  username: string;
  password?: string;
  ssl?: boolean;
}

export interface ColumnInfo {
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string | null;
  is_primary_key: boolean;
  is_foreign_key: boolean;
  foreign_table?: string;
  foreign_column?: string;
}

export interface IndexInfo {
  index_name: string;
  columns: string[];
  is_unique: boolean;
  index_type: string;
}

export interface TableInfo {
  table_name: string;
  table_schema: string;
  row_estimate: number;
  columns: ColumnInfo[];
  indexes: IndexInfo[];
}

export interface SchemaContext {
  tables: TableInfo[];
  totalTables: number;
  extractedAt: string;
  erd_mermaid?: string;
  dfd_mermaid?: string;
  flow_mermaid?: string;
}

export interface QueryHistoryItem {
  id: string;
  user_id: string;
  connection_id: string;
  query_text: string;
  status: string;
  duration_ms: number;
  row_count: number;
  error_message: string | null;
  executed_at: string;
}

export interface Mission {
  id: string;
  user_id: string;
  connection_id: string;
  title: string;
  description: string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  ai_reasoning: string;
  created_at: string;
  updated_at: string;
}

export interface ArchitectAudit {
  id: string;
  user_id: string;
  connection_id: string;
  connection_name?: string;
  scale: string;
  requirements: string;
  review_data: any;
  scalability_score: number;
  created_at: string;
}

export interface DesignStudioSession {
  id: string;
  user_id: string;
  mode: 'new' | 'existing';
  connection_id: string | null;
  requirements_transcript: any[];
  current_design: any;
  status: 'active' | 'completed' | 'deployed' | 'archived';
  created_at: string;
  updated_at: string;
}
