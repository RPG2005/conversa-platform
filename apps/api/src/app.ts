import Fastify from 'fastify';
import type { AppConfig } from './config.js';
import { registerAuthRoutes } from './auth/routes.js';
import type { AuthRateLimiter, AuthRepository } from './auth/types.js';
import { checkHealth, type HealthDependencies } from './health.js';

export const buildApp = (
  config: AppConfig,
  healthDependencies: HealthDependencies,
  authDependencies?: { repository: AuthRepository; rateLimiter: AuthRateLimiter },
) => {
  const app = Fastify({ logger: true });

  app.get('/health', async (_request, reply) => {
    const report = await checkHealth(healthDependencies);
    return reply.code(report.status === 'ok' ? 200 : 503).send(report);
  });

  if (authDependencies) {
    registerAuthRoutes(app, config, authDependencies.repository, authDependencies.rateLimiter);
  }

  return app;
};
