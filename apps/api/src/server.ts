import { Pool } from 'pg';
import { Redis } from 'ioredis';
import { buildApp } from './app.js';
import { createAuthRateLimiter } from './auth/rate-limit.js';
import { createAuthRepository } from './auth/repository.js';
import { createConversationRepository } from './conversations/repository.js';
import { createRealtimeGateway } from './realtime/gateway.js';
import { createAttachmentStorage } from './storage/service.js';
import { createNotificationQueue } from './notifications/queue.js';
import { loadConfig } from './config.js';

const config = loadConfig();
const database = new Pool({ connectionString: config.DATABASE_URL });
const redis = new Redis(config.REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 1 });
const realtimeGateway = createRealtimeGateway(redis, redis.duplicate());
const attachmentStorage = createAttachmentStorage(config);
const notificationQueue = createNotificationQueue(redis);

const app = await buildApp(config, {
  checkDatabase: async () => {
    await database.query('SELECT 1');
  },
  checkRedis: async () => {
    if (redis.status === 'wait') await redis.connect();
    await redis.ping();
  },
}, {
  repository: createAuthRepository(database),
  rateLimiter: createAuthRateLimiter(redis, config.AUTH_RATE_LIMIT, config.AUTH_RATE_LIMIT_WINDOW_SECONDS),
}, createConversationRepository(database), realtimeGateway, attachmentStorage, notificationQueue);

const shutdown = async () => {
  await app.close();
  await database.end();
  await redis.quit();
  await realtimeGateway.close();
};

process.on('SIGINT', () => void shutdown().then(() => process.exit(0)));
process.on('SIGTERM', () => void shutdown().then(() => process.exit(0)));

await app.listen({ host: config.HOST, port: config.PORT });
