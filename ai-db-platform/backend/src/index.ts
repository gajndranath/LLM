import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import crypto from 'crypto';
import cookieParser from 'cookie-parser';

// Core config
import { env } from './config/env';
import { testDatabaseConnection, dbQuery } from './config/database';
import { testRedisConnection, redisClient, getRedisStatus } from './config/redis';

// Middleware
import { errorHandler } from './middleware/error.middleware';

// Routes
import authRoutes from './routes/auth.routes';
import connectionRoutes from './routes/connection.routes';
import queryRoutes from './routes/query.routes';
import architectRoutes from './routes/architect.routes';
import missionRoutes from './routes/mission.routes';
import designStudioRoutes from './routes/design-studio.routes';
import tableInspectorRoutes from './routes/table-inspector.routes';
import adminRoutes from './routes/admin.routes';
import superAdminRoutes from './routes/super-admin.routes';

const app = express();

// ── Standard Middleware ──────────────────────────────────────
app.use(helmet());

// Request ID & Logging Middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const requestId = (req.headers['x-request-id'] as string) || crypto.randomUUID();
  (req as any).id = requestId;
  res.setHeader('X-Request-Id', requestId);

  const startTime = Date.now();
  console.log(`📡 [${requestId}] ${req.method} ${req.url} - Request received`);

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    console.log(`📡 [${requestId}] ${req.method} ${req.url} - Completed ${res.statusCode} in ${duration}ms`);
  });

  next();
});

// Enforce HTTPS redirection in production when behind reverse proxies
if (env.NODE_ENV === 'production') {
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.headers['x-forwarded-proto'] && req.headers['x-forwarded-proto'] !== 'https') {
      return res.redirect(301, `https://${req.headers.host}${req.url}`);
    }
    next();
  });
}

app.use(cors({
  origin: env.FRONTEND_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ── API Health Endpoint ──────────────────────────────────────
app.get('/api/health', async (req: Request, res: Response) => {
  let postgresStatus = 'unknown';
  let redisStatus = 'unknown';

  try {
    const pgResult = await dbQuery('SELECT 1');
    if (pgResult) postgresStatus = 'connected';
  } catch (err: any) {
    postgresStatus = `error: ${err.message}`;
  }

  if (getRedisStatus()) {
    try {
      const pingResult = await redisClient.ping();
      if (pingResult === 'PONG') redisStatus = 'connected';
    } catch (err: any) {
      redisStatus = `error: ${err.message}`;
    }
  } else {
    redisStatus = 'disconnected';
  }

  const overallStatus = (postgresStatus === 'connected' && (redisStatus === 'connected' || redisStatus === 'disconnected')) ? 'ok' : 'degraded';

  return res.status(overallStatus === 'ok' ? 200 : 503).json({
    status: overallStatus,
    timestamp: new Date().toISOString(),
    service: 'ai-db-platform-backend',
    node_env: env.NODE_ENV,
    checks: {
      postgres: postgresStatus,
      redis: redisStatus
    }
  });
});

// ── Application Routes ───────────────────────────────────────
import billingRoutes from './routes/billing.routes';

app.use('/api/auth', authRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/connections', connectionRoutes);
app.use('/api/connections', tableInspectorRoutes);
app.use('/api/query', queryRoutes);
app.use('/api/architect', architectRoutes);
app.use('/api/missions', missionRoutes);
app.use('/api/design-studio', designStudioRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/super-admin', superAdminRoutes);

// ── 404 Route Handler ────────────────────────────────────────
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// ── Global Error Handler (Must be last) ──────────────────────
app.use(errorHandler);

// ── System Initialization ────────────────────────────────────
import { startCleanupScheduler } from './services/cleanup.service';

const bootstrap = async () => {
  try {
    console.log('🏁 Initializing AI DB Platform Backend...');
    
    // 1. Connect to PostgreSQL (Neon)
    await testDatabaseConnection();
    
    // 2. Connect to Redis (Optional for local dev)
    try {
      await testRedisConnection();
    } catch (redisErr) {
      console.warn('⚠️ Redis connection failed. Proceeding without cache.');
    }

    // 3. Start periodic DB cleanup tasks
    startCleanupScheduler();

    // 4. Listen for requests
    app.listen(env.PORT, () => {
      console.log(`\n🚀 Backend Live: http://localhost:${env.PORT}`);
      console.log(`🌍 Environment: ${env.NODE_ENV}\n`);
    });

  } catch (startupError) {
    console.error('❌ Critical failure during startup:');
    console.error(startupError);
    process.exit(1);
  }
};

bootstrap();
