import { Request, Response, NextFunction } from 'express';
import { redisClient, getRedisStatus } from '../config/redis';
import { ApiError } from '../utils/ApiError';

interface LimiterOptions {
  windowMs: number;
  max: number;
  message: string;
  prefix: string;
}

// In-memory fallback map: key -> timestamps
const memoryCache = new Map<string, number[]>();

// Prune memory cache every 5 minutes to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamps] of memoryCache.entries()) {
    const active = timestamps.filter(t => now - t < 60 * 60 * 1000);
    if (active.length === 0) {
      memoryCache.delete(key);
    } else {
      memoryCache.set(key, active);
    }
  }
}, 5 * 60 * 1000).unref();

export const createRateLimiter = (options: LimiterOptions) => {
  const { windowMs, max, message, prefix } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    // Identify by user ID if authenticated, else IP address
    const identifier = req.user?.userId || req.ip || 'anonymous';
    const key = `rate:${prefix}:${identifier}`;
    const now = Date.now();

    if (getRedisStatus()) {
      try {
        const pipeline = redisClient.multi();
        const minTime = now - windowMs;
        const member = `${now}-${Math.random()}`; // unique member to avoid zset collisions

        // Remove timestamps older than the window limits
        pipeline.zRemRangeByScore(key, 0, minTime);
        // Get card of remaining timestamps
        pipeline.zCard(key);
        // Add current timestamp
        pipeline.zAdd(key, { score: now, value: member });
        // Set sliding window TTL expiration
        pipeline.expire(key, Math.ceil(windowMs / 1000) * 2);

        const results = await pipeline.exec();
        // The second command (index 1) returns the ZCARD count
        const count = results[1] as number;

        if (count >= max) {
          // Exceeded limit: remove the newly added member to prevent false counts
          await redisClient.zRem(key, member);
          return next(new ApiError(429, message));
        }

        return next();
      } catch (err) {
        console.warn(`[RateLimiter] Redis command failed, falling back to memory:`, err);
      }
    }

    // In-memory sliding window fallback logic
    const timestamps = memoryCache.get(key) || [];
    const active = timestamps.filter(t => now - t < windowMs);

    if (active.length >= max) {
      return next(new ApiError(429, message));
    }

    active.push(now);
    memoryCache.set(key, active);
    return next();
  };
};
