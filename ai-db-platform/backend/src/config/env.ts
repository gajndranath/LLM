import dotenv from 'dotenv';
dotenv.config();

// Validate required env variables
const required = ['JWT_SECRET', 'JWT_REFRESH_SECRET', 'ENCRYPTION_KEY', 'AI_SERVICE_SECRET'];
for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`❌ Missing required environment variable: ${key}`);
  }
}

const isProd = process.env.NODE_ENV === 'production';

export const env = {
  // Server
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3001', 10),
  FRONTEND_URL: process.env.FRONTEND_URL || (isProd ? 'https://llm-coral.vercel.app' : 'http://localhost:3000'),

  // Database (platform's own)
  DATABASE_URL: process.env.DATABASE_URL || '',
  POSTGRES_HOST: process.env.POSTGRES_HOST || 'localhost',
  POSTGRES_PORT: parseInt(process.env.POSTGRES_PORT || '5432', 10),
  POSTGRES_DB: process.env.POSTGRES_DB || 'ai_db_platform',
  POSTGRES_USER: process.env.POSTGRES_USER || 'aidbuser',
  POSTGRES_PASSWORD: process.env.POSTGRES_PASSWORD || '',

  // Redis
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',

  // JWT
  JWT_SECRET: process.env.JWT_SECRET!,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET!,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '15m',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',

  // Encryption (for user DB credentials)
  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY!,

  // AI Service
  AI_SERVICE_URL: process.env.AI_SERVICE_URL || (isProd ? 'https://llm-1-jgn4.onrender.com' : 'http://localhost:8000'),
  AI_SERVICE_SECRET: process.env.AI_SERVICE_SECRET!,

  // Query limits
  MAX_QUERY_ROWS: parseInt(process.env.MAX_QUERY_ROWS || '10000', 10),
  QUERY_TIMEOUT_MS: parseInt(process.env.QUERY_TIMEOUT_MS || '30000', 10),

  // Super Admin Seeding
  SUPER_ADMIN_EMAIL: process.env.SUPER_ADMIN_EMAIL || '',
  SUPER_ADMIN_PASSWORD: process.env.SUPER_ADMIN_PASSWORD || '',
  SUPER_ADMIN_NAME: process.env.SUPER_ADMIN_NAME || 'Platform Owner',

  // Payment Gateways
  RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID || '',
  RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET || '',
  RAZORPAY_WEBHOOK_SECRET: process.env.RAZORPAY_WEBHOOK_SECRET || '',
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || '',
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || '',
  STRIPE_PUBLISHABLE_KEY: process.env.STRIPE_PUBLISHABLE_KEY || '',
} as const;
