import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import http from 'http';
import { Server as SocketServer } from 'socket.io';

// Core config
import { env } from './config/env';
import { testDatabaseConnection } from './config/database';
import { testRedisConnection } from './config/redis';

// Middleware
import { errorHandler } from './middleware/error.middleware';

// Routes
import authRoutes from './routes/auth.routes';
import connectionRoutes from './routes/connection.routes';
import queryRoutes from './routes/query.routes';
import architectRoutes from './routes/architect.routes';
import missionRoutes from './routes/mission.routes';
import designStudioRoutes from './routes/design-studio.routes';

const app = express();
const server = http.createServer(app);

// ── Socket.IO Setup ──────────────────────────────────────────
export const io = new SocketServer(server, {
  cors: { 
    origin: env.FRONTEND_URL, 
    credentials: true 
  }
});

io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);
  socket.on('disconnect', () => console.log(`🔌 Client disconnected: ${socket.id}`));
});

// ── Standard Middleware ──────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: env.FRONTEND_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── API Health Endpoint ──────────────────────────────────────
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'ai-db-platform-backend',
    node_env: env.NODE_ENV
  });
});

// ── Application Routes ───────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/connections', connectionRoutes);
app.use('/api/query', queryRoutes);
app.use('/api/architect', architectRoutes);
app.use('/api/missions', missionRoutes);
app.use('/api/design-studio', designStudioRoutes);

// ── 404 Route Handler ────────────────────────────────────────
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// ── Global Error Handler (Must be last) ──────────────────────
app.use(errorHandler);

// ── System Initialization ────────────────────────────────────
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

    // 3. Listen for requests
    server.listen(env.PORT, () => {
      console.log(`\n🚀 Backend Live: http://localhost:${env.PORT}`);
      console.log(`📡 WebSocket: Active`);
      console.log(`🌍 Environment: ${env.NODE_ENV}\n`);
    });

  } catch (startupError) {
    console.error('❌ Critical failure during startup:');
    console.error(startupError);
    process.exit(1);
  }
};

bootstrap();
