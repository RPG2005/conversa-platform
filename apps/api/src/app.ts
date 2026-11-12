import Fastify from 'fastify';
import type { AppConfig } from './config.js';
import { checkHealth, type HealthDependencies } from './health.js';

export const buildApp = (config: AppConfig, healthDependencies: HealthDependencies) => {
  const app = Fastify({ logger: true });

  app.get('/health', async (_request, reply) => {
    const report = await checkHealth(healthDependencies);
    return reply.code(report.status === 'ok' ? 200 : 503).send(report);
  });

  return app;
};
