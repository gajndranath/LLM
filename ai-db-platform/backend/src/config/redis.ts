import { createClient } from 'redis';
import { env } from './env';

let isRedisConnected = false;

export const getRedisStatus = () => isRedisConnected;

export const redisClient = createClient({ 
  url: env.REDIS_URL,
  socket: {
    reconnectStrategy: (retries) => {
      if (retries > 5) {
        console.warn('⚠️ Redis: Max reconnection attempts reached. Disabling cache.');
        return false; // Stop retrying
      }
      return 500; // Retry after 500ms
    }
  }
});

redisClient.on('error', (err) => {
  if (isRedisConnected) {
    console.error('❌ Redis error:', err.message);
  }
});

redisClient.on('connect', () => {
  isRedisConnected = true;
  console.log('✅ Redis connected');
});

export const testRedisConnection = async (): Promise<void> => {
  if (!env.REDIS_URL) {
    console.warn('⚠️ Redis URL not provided. Caching disabled.');
    return;
  }
  
  try {
    await redisClient.connect();
    await redisClient.ping();
    isRedisConnected = true;
  } catch (error) {
    isRedisConnected = false;
    throw error; // Let the caller handle it
  }
};

// Helpers check if connected before calling
export const cacheGet = async (key: string): Promise<string | null> => {
  if (!isRedisConnected) return null;
  try {
    return await redisClient.get(key);
  } catch {
    return null;
  }
};

export const cacheSet = async (key: string, value: string, ttlSeconds = 300): Promise<void> => {
  if (!isRedisConnected) return;
  try {
    await redisClient.setEx(key, ttlSeconds, value);
  } catch {
    // Ignore cache errors
  }
};

export const cacheDel = async (key: string): Promise<void> => {
  if (!isRedisConnected) return;
  try {
    await redisClient.del(key);
  } catch {
    // Ignore
  }
};
