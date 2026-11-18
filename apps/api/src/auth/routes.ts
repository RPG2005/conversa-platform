import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import type { AppConfig } from '../config.js';
import {
  clearSessionCookie,
  createSessionToken,
  hashSessionToken,
  readSessionToken,
  serializeSessionCookie,
} from './cookies.js';
import { hashPassword, verifyPassword } from './password.js';
import type { AuthRateLimiter, AuthRepository } from './types.js';

const registrationSchema = z.object({
  email: z.email().max(320).transform((email) => email.toLowerCase()),
  displayName: z.string().trim().min(1).max(80),
  password: z.string().min(12).max(128),
});

const loginSchema = z.object({
  email: z.email().max(320).transform((email) => email.toLowerCase()),
  password: z.string().min(1).max(128),
});
const notificationPreferenceSchema = z.object({ emailEnabled: z.boolean() });

const publicUser = (user: { id: string; email: string; displayName: string; createdAt?: Date }) => ({
  id: user.id,
  email: user.email,
  displayName: user.displayName,
  ...(user.createdAt ? { createdAt: user.createdAt.toISOString() } : {}),
});

const sessionCookieOptions = (config: AppConfig) => ({
  maxAgeSeconds: config.SESSION_TTL_HOURS * 60 * 60,
  secure: config.NODE_ENV === 'production',
});

export const requireSession = async (
  request: FastifyRequest,
  reply: FastifyReply,
  repository: AuthRepository,
) => {
  const token = readSessionToken(request.headers.cookie);
  if (!token) return reply.code(401).send({ error: 'Unauthorized' });

  const user = await repository.findSessionUser(hashSessionToken(token));
  if (!user) return reply.code(401).send({ error: 'Unauthorized' });

  return user;
};

export const registerAuthRoutes = (
  app: FastifyInstance,
  config: AppConfig,
  repository: AuthRepository,
  rateLimiter: AuthRateLimiter,
) => {
  app.post('/auth/register', async (request, reply) => {
    if (!(await rateLimiter.consume(`auth:register:${request.ip}`))) {
      return reply.code(429).send({ error: 'Too many requests' });
    }

    const parsed = registrationSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid registration data' });

    const user = await repository.createUser({
      email: parsed.data.email,
      displayName: parsed.data.displayName,
      passwordHash: await hashPassword(parsed.data.password),
    });
    if (!user) return reply.code(409).send({ error: 'An account with this email already exists' });

    const token = createSessionToken();
    const { maxAgeSeconds, secure } = sessionCookieOptions(config);
    await repository.createSession({
      userId: user.id,
      tokenHash: hashSessionToken(token),
      expiresAt: new Date(Date.now() + maxAgeSeconds * 1_000),
    });
    reply.header('set-cookie', serializeSessionCookie(token, maxAgeSeconds, secure));
    return reply.code(201).send({ user: publicUser(user) });
  });

  app.post('/auth/login', async (request, reply) => {
    if (!(await rateLimiter.consume(`auth:login:${request.ip}`))) {
      return reply.code(429).send({ error: 'Too many requests' });
    }

    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid login data' });

    const user = await repository.findUserByEmail(parsed.data.email);
    if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
      return reply.code(401).send({ error: 'Invalid email or password' });
    }

    const token = createSessionToken();
    const { maxAgeSeconds, secure } = sessionCookieOptions(config);
    await repository.createSession({
      userId: user.id,
      tokenHash: hashSessionToken(token),
      expiresAt: new Date(Date.now() + maxAgeSeconds * 1_000),
    });
    reply.header('set-cookie', serializeSessionCookie(token, maxAgeSeconds, secure));
    return reply.send({ user: publicUser(user) });
  });

  app.post('/auth/logout', async (request, reply) => {
    const token = readSessionToken(request.headers.cookie);
    if (token) await repository.deleteSession(hashSessionToken(token));
    reply.header('set-cookie', clearSessionCookie(config.NODE_ENV === 'production'));
    return reply.code(204).send();
  });

  app.get('/auth/me', async (request, reply) => {
    const user = await requireSession(request, reply, repository);
    if (!user || 'statusCode' in user) return;
    return reply.send({ user: publicUser(user) });
  });

  app.get('/auth/notification-preferences', async (request, reply) => {
    const user = await requireSession(request, reply, repository);
    if (!user || 'statusCode' in user) return;
    const preference = await repository.getNotificationPreference(user.id);
    return reply.send({ notification: { emailEnabled: preference.emailEnabled, updatedAt: preference.updatedAt?.toISOString() ?? null } });
  });

  app.put('/auth/notification-preferences', async (request, reply) => {
    const user = await requireSession(request, reply, repository);
    if (!user || 'statusCode' in user) return;
    const parsed = notificationPreferenceSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid notification preferences' });
    const preference = await repository.updateNotificationPreference(user.id, parsed.data);
    return reply.send({ notification: { emailEnabled: preference.emailEnabled, updatedAt: preference.updatedAt?.toISOString() ?? null } });
  });
};
