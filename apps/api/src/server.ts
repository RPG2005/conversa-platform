import { Pool } from 'pg';
import { Redis } from 'ioredis';
import { buildApp } from './app.js';
import { loadConfig } from './config.js';

const config = loadConfig();
const database = new Pool({ connectionString: config.DATABASE_URL });
const redis = new Redis(config.REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 1 });

const app = buildApp(config, {
  checkDatabase: async () => {
    await database.query('SELECT 1');
  },
  checkRedis: async () => {
    if (redis.status === 'wait') await redis.connect();
    await redis.ping();
  },
});

const shutdown = async () => {
  await app.close();
  await database.end();
  await redis.quit();
};

process.on('SIGINT', () => void shutdown().then(() => process.exit(0)));
process.on('SIGTERM', () => void shutdown().then(() => process.exit(0)));

await app.listen({ host: config.HOST, port: config.PORT });
