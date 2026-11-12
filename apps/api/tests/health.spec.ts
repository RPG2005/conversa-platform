import { describe, expect, it, vi } from 'vitest';
import { buildApp } from '../src/app.js';
import type { AppConfig } from '../src/config.js';

const config: AppConfig = {
  DATABASE_URL: 'postgresql://user:password@localhost:5432/chat_yes_no',
  REDIS_URL: 'redis://:password@localhost:6379',
  API_SECRET: 'a-very-long-local-secret-with-at-least-32-characters',
  HOST: '127.0.0.1',
  PORT: 3000,
};

describe('GET /health', () => {
  it('returns 200 when all dependencies are healthy', async () => {
    const app = buildApp(config, {
      checkDatabase: vi.fn().mockResolvedValue(undefined),
      checkRedis: vi.fn().mockResolvedValue(undefined),
    });

    const response = await app.inject({ method: 'GET', url: '/health' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok', services: { database: 'ok', redis: 'ok' } });
    await app.close();
  });

  it('returns 503 and identifies an unavailable dependency', async () => {
    const app = buildApp(config, {
      checkDatabase: vi.fn().mockRejectedValue(new Error('database unavailable')),
      checkRedis: vi.fn().mockResolvedValue(undefined),
    });

    const response = await app.inject({ method: 'GET', url: '/health' });

    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({ status: 'error', services: { database: 'error', redis: 'ok' } });
    await app.close();
  });
});
