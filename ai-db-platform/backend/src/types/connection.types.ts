export type DatabaseEngineType = 'postgres' | 'mysql' | 'mongodb' | 'redis' | 'sqlite';

export interface ConnectionInput {
  name: string;
  host: string;
  port?: number;
  databaseName: string;
  username: string;
  password: string;
  sslEnabled?: boolean;
  dbType?: DatabaseEngineType;
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
  db_type?: DatabaseEngineType;
  last_tested_at: string | null;
  last_test_ok: boolean | null;
  created_at: string;
}
