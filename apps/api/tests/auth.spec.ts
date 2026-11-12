import { afterEach, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import { hashSessionToken, readSessionToken } from '../src/auth/cookies.js';
import { hashPassword } from '../src/auth/password.js';
import type { AuthRepository, AuthUser } from '../src/auth/types.js';
import type { AppConfig } from '../src/config.js';

const config: AppConfig = {
  DATABASE_URL: 'postgresql://user:password@localhost:5432/chat_yes_no',
  REDIS_URL: 'redis://:password@localhost:6379',
  API_SECRET: 'a-very-long-local-secret-with-at-least-32-characters',
  SESSION_TTL_HOURS: 24,
  AUTH_RATE_LIMIT: 5,
  AUTH_RATE_LIMIT_WINDOW_SECONDS: 60,
  NODE_ENV: 'test',
  HOST: '127.0.0.1',
  PORT: 3000,
};

const apps: ReturnType<typeof buildApp>[] = [];

const createRepository = () => {
  const users = new Map<string, AuthUser>();
  const sessions = new Map<string, string>();
  let userSequence = 0;

  const repository: AuthRepository = {
    async findUserByEmail(email) {
      return [...users.values()].find((user) => user.email === email) ?? null;
    },
    async createUser(input) {
      if ([...users.values()].some((user) => user.email === input.email)) return null;
      const user: AuthUser = { id: `user-${++userSequence}`, createdAt: new Date(), ...input };
      users.set(user.id, user);
      return user;
    },
    async createSession(input) {
      sessions.set(input.tokenHash, input.userId);
    },
    async findSessionUser(tokenHash) {
      const user = users.get(sessions.get(tokenHash) ?? '');
      return user ? { id: user.id, email: user.email, displayName: user.displayName } : null;
    },
    async deleteSession(tokenHash) {
      sessions.delete(tokenHash);
    },
  };

  return { repository, users, sessions };
};

const buildAuthTestApp = (allowRequest = true) => {
  const state = createRepository();
  const app = buildApp(
    config,
    { checkDatabase: async () => undefined, checkRedis: async () => undefined },
    { repository: state.repository, rateLimiter: { consume: async () => allowRequest } },
  );
  apps.push(app);
  return { app, ...state };
};

afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});

describe('authentication routes', () => {
  it('registers an account, stores only a password hash, and sets an HTTP-only session cookie', async () => {
    const { app, users } = buildAuthTestApp();

    const response = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { email: 'HELLO@example.com', displayName: 'Ada', password: 'secure-password-123' },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json().user).toMatchObject({ email: 'hello@example.com', displayName: 'Ada' });
    expect(response.json().user.passwordHash).toBeUndefined();
    expect(response.headers['set-cookie']).toContain('HttpOnly');
    expect(response.headers['set-cookie']).toContain('SameSite=Lax');
    expect([...users.values()][0]?.passwordHash).not.toContain('secure-password-123');
  });

  it('rejects invalid, duplicate, and rate-limited registrations', async () => {
    const { app } = buildAuthTestApp();
    const payload = { email: 'ada@example.com', displayName: 'Ada', password: 'secure-password-123' };

    expect((await app.inject({ method: 'POST', url: '/auth/register', payload: { ...payload, password: 'short' } })).statusCode).toBe(400);
    expect((await app.inject({ method: 'POST', url: '/auth/register', payload })).statusCode).toBe(201);
    const duplicate = await app.inject({ method: 'POST', url: '/auth/register', payload });
    expect(duplicate.statusCode).toBe(409);
    expect(duplicate.json()).toEqual({ error: 'An account with this email already exists' });

    const limited = buildAuthTestApp(false);
    expect((await limited.app.inject({ method: 'POST', url: '/auth/register', payload })).statusCode).toBe(429);
  });

  it('logs in, exposes the authenticated profile, and invalidates the session on logout', async () => {
    const { app, repository, sessions } = buildAuthTestApp();
    const passwordHash = await hashPassword('secure-password-123');
    await repository.createUser({ email: 'ada@example.com', displayName: 'Ada', passwordHash });

    expect((await app.inject({ method: 'POST', url: '/auth/login', payload: { email: 'ada@example.com', password: 'wrong-password' } })).statusCode).toBe(401);

    const login = await app.inject({ method: 'POST', url: '/auth/login', payload: { email: 'ada@example.com', password: 'secure-password-123' } });
    const cookie = login.headers['set-cookie'] as string;
    const token = readSessionToken(cookie);
    expect(login.statusCode).toBe(200);
    expect(token).not.toBeNull();
    expect(sessions.has(hashSessionToken(token!))).toBe(true);

    const me = await app.inject({ method: 'GET', url: '/auth/me', headers: { cookie } });
    expect(me.statusCode).toBe(200);
    expect(me.json()).toEqual({ user: { id: 'user-1', email: 'ada@example.com', displayName: 'Ada' } });
    expect((await app.inject({ method: 'GET', url: '/auth/me' })).statusCode).toBe(401);

    const logout = await app.inject({ method: 'POST', url: '/auth/logout', headers: { cookie } });
    expect(logout.statusCode).toBe(204);
    expect(logout.headers['set-cookie']).toContain('Max-Age=0');
    expect(sessions.has(hashSessionToken(token!))).toBe(false);
    expect((await app.inject({ method: 'GET', url: '/auth/me', headers: { cookie } })).statusCode).toBe(401);
  });
});
