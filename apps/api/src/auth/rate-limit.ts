import type { Redis } from 'ioredis';
import type { AuthRateLimiter } from './types.js';

export const createAuthRateLimiter = (redis: Redis, limit: number, windowSeconds: number): AuthRateLimiter => ({
  async consume(key) {
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, windowSeconds);
    return count <= limit;
  },
});
