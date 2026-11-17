import Fastify from 'fastify';
import websocket from '@fastify/websocket';
import type { AppConfig } from './config.js';
import { registerAuthRoutes } from './auth/routes.js';
import type { AuthRateLimiter, AuthRepository } from './auth/types.js';
import { registerConversationRoutes } from './conversations/routes.js';
import type { ConversationRepository } from './conversations/types.js';
import { hashSessionToken, readSessionToken } from './auth/cookies.js';
import type { RealtimeGateway } from './realtime/gateway.js';
import { parseRealtimeCommand } from './realtime/protocol.js';
import type { AttachmentStorage } from './storage/service.js';
import type { NotificationQueue } from './notifications/queue.js';
import { checkHealth, type HealthDependencies } from './health.js';

export const buildApp = async (
  config: AppConfig,
  healthDependencies: HealthDependencies,
  authDependencies?: { repository: AuthRepository; rateLimiter: AuthRateLimiter },
  conversationRepository?: ConversationRepository,
  realtimeGateway?: RealtimeGateway,
  attachmentStorage?: AttachmentStorage,
  notificationQueue?: NotificationQueue,
) => {
  const app = Fastify({ logger: true });
  await app.register(websocket);

  app.get('/health', async (_request, reply) => {
    const report = await checkHealth(healthDependencies);
    return reply.code(report.status === 'ok' ? 200 : 503).send(report);
  });

  if (authDependencies) {
    registerAuthRoutes(app, config, authDependencies.repository, authDependencies.rateLimiter);
    if (conversationRepository) {
      registerConversationRoutes(app, authDependencies.repository, conversationRepository, realtimeGateway, attachmentStorage, notificationQueue);
      if (realtimeGateway) {
        app.get('/ws/conversations/:conversationId', { websocket: true }, (socket, request) => {
          const conversationId = (request.params as { conversationId?: string }).conversationId;
          const token = readSessionToken(request.headers.cookie);
          if (!conversationId || !token) return socket.close(1008, 'Unauthorized');
          void authDependencies.repository.findSessionUser(hashSessionToken(token)).then(async (user) => {
            if (!user || !(await conversationRepository.isMember(conversationId, user.id))) return socket.close(1008, 'Forbidden');
            const connectionId = crypto.randomUUID();
            const unsubscribe = await realtimeGateway.subscribe(conversationId, user.id, connectionId, socket);
            socket.on('message', (payload) => {
              const command = parseRealtimeCommand(payload.toString());
              if (command) {
                void realtimeGateway.handleCommand(conversationId, user.id, connectionId, command)
                  .catch(() => socket.close(1011, 'Realtime command failed'));
              }
            });
            socket.once('close', () => { void unsubscribe(); });
          }).catch(() => socket.close(1011, 'Internal error'));
        });
      }
    }
  }

  return app;
};
