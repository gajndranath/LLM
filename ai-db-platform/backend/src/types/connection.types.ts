export interface ConnectionInput {
  name: string;
  host: string;
  port?: number;
  databaseName: string;
  username: string;
  password: string;
  sslEnabled?: boolean;
}

export interface ConnectionRow {
  id: string;
  user_id: string;
  name: string;
  host: string;
  port: number;
  database_name: string;
  username: string;
  ssl_enabled: boolean;
  is_active: boolean;
  last_tested_at: string | null;
  last_test_ok: boolean | null;
  created_at: string;
}
