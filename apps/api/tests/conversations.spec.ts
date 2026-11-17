import { afterEach, describe, expect, it } from 'vitest';
import WebSocket from 'ws';
import { buildApp } from '../src/app.js';
import { hashSessionToken, sessionCookieName } from '../src/auth/cookies.js';
import type { AuthRepository, AuthSessionUser } from '../src/auth/types.js';
import type { AppConfig } from '../src/config.js';
import type { Conversation, ConversationRepository, Message } from '../src/conversations/types.js';
import type { RealtimeGateway } from '../src/realtime/gateway.js';

const config: AppConfig = {
  DATABASE_URL: 'postgresql://user:password@localhost:5432/chat_yes_no', REDIS_URL: 'redis://:password@localhost:6379',
  API_SECRET: 'a-very-long-local-secret-with-at-least-32-characters', SESSION_TTL_HOURS: 24, AUTH_RATE_LIMIT: 5,
  AUTH_RATE_LIMIT_WINDOW_SECONDS: 60, NODE_ENV: 'test', HOST: '127.0.0.1', PORT: 3000,
};

const users: AuthSessionUser[] = [
  { id: '00000000-0000-4000-8000-000000000001', email: 'ada@example.com', displayName: 'Ada' },
  { id: '00000000-0000-4000-8000-000000000002', email: 'bob@example.com', displayName: 'Bob' },
  { id: '00000000-0000-4000-8000-000000000003', email: 'eve@example.com', displayName: 'Eve' },
];

const apps: Awaited<ReturnType<typeof buildApp>>[] = [];

const setup = async (realtimeGateway?: RealtimeGateway) => {
  const sessions = new Map(users.map((user) => [hashSessionToken(`${user.displayName.toLowerCase()}-token`), user.id]));
  const conversations = new Map<string, Conversation>();
  const members = new Map<string, Set<string>>();
  const messages: Message[] = [];
  let conversationSequence = 10;
  let messageSequence = 100;

  const authRepository: AuthRepository = {
    findUserByEmail: async () => null, createUser: async () => null, createSession: async () => undefined, deleteSession: async () => undefined,
    findSessionUser: async (tokenHash) => users.find((user) => user.id === sessions.get(tokenHash)) ?? null,
  };
  const conversationRepository: ConversationRepository = {
    findUserIdByEmail: async (email) => users.find((user) => user.email === email)?.id ?? null,
    createConversation: async (creatorId, participantId) => {
      const now = new Date();
      const id = `00000000-0000-4000-8000-${String(++conversationSequence).padStart(12, '0')}`;
      const conversation = { id, createdAt: now, updatedAt: now };
      conversations.set(id, conversation); members.set(id, new Set([creatorId, participantId])); return conversation;
    },
    listConversations: async (userId) => [...conversations.values()].filter((conversation) => members.get(conversation.id)?.has(userId)),
    isMember: async (conversationId, userId) => members.get(conversationId)?.has(userId) ?? false,
    addMember: async (conversationId, userId) => {
      const group = members.get(conversationId); if (!group || group.has(userId)) return false; group.add(userId); return true;
    },
    createMessage: async ({ conversationId, authorId, content }) => {
      const message = { id: `00000000-0000-4000-8000-${String(++messageSequence).padStart(12, '0')}`, conversationId, authorId, content, createdAt: new Date() };
      messages.push(message); return message;
    },
    listMessages: async ({ conversationId, limit, cursor }) => messages
      .filter((message) => message.conversationId === conversationId)
      .filter((message) => !cursor || `${message.createdAt.toISOString()}-${message.id}` < `${cursor.createdAt}-${cursor.id}`)
      .sort((left, right) => `${right.createdAt.toISOString()}-${right.id}`.localeCompare(`${left.createdAt.toISOString()}-${left.id}`))
      .slice(0, limit),
    listMessagesAfter: async ({ conversationId, limit, cursor }) => messages
      .filter((message) => message.conversationId === conversationId)
      .filter((message) => `${message.createdAt.toISOString()}-${message.id}` > `${cursor.createdAt}-${cursor.id}`)
      .sort((left, right) => `${left.createdAt.toISOString()}-${left.id}`.localeCompare(`${right.createdAt.toISOString()}-${right.id}`))
      .slice(0, limit),
  };
  const app = await buildApp(config, { checkDatabase: async () => undefined, checkRedis: async () => undefined }, { repository: authRepository, rateLimiter: { consume: async () => true } }, conversationRepository, realtimeGateway);
  apps.push(app);
  const cookie = (name: string) => `${sessionCookieName}=${name}-token`;
  return { app, cookie };
};

const openSocket = (url: string, cookie: string) => new Promise<WebSocket>((resolve, reject) => {
  const socket = new WebSocket(url, { headers: { cookie } });
  socket.once('open', () => resolve(socket));
  socket.once('error', reject);
});

const openThenClose = (url: string, cookie: string) => new Promise<number>((resolve, reject) => {
  const socket = new WebSocket(url, { headers: { cookie } });
  socket.once('close', (code) => resolve(code));
  socket.once('error', reject);
});

afterEach(async () => { await Promise.all(apps.splice(0).map((app) => app.close())); });

describe('conversation routes', () => {
  it('creates a private conversation and hides it from non-members', async () => {
    const { app, cookie } = await setup();
    const created = await app.inject({ method: 'POST', url: '/conversations', headers: { cookie: cookie('ada') }, payload: { participantEmail: 'bob@example.com' } });
    const conversationId = created.json().conversation.id;
    expect(created.statusCode).toBe(201);
    expect((await app.inject({ method: 'GET', url: '/conversations', headers: { cookie: cookie('bob') } })).json().conversations).toHaveLength(1);
    expect((await app.inject({ method: 'POST', url: `/conversations/${conversationId}/messages`, headers: { cookie: cookie('eve') }, payload: { content: 'intrusion' } })).statusCode).toBe(404);
    expect((await app.inject({ method: 'GET', url: '/conversations' })).statusCode).toBe(401);
  });

  it('adds members, persists messages, and paginates with a cursor', async () => {
    const { app, cookie } = await setup();
    const created = await app.inject({ method: 'POST', url: '/conversations', headers: { cookie: cookie('ada') }, payload: { participantEmail: 'bob@example.com' } });
    const conversationId = created.json().conversation.id;
    expect((await app.inject({ method: 'POST', url: `/conversations/${conversationId}/members`, headers: { cookie: cookie('ada') }, payload: { email: 'eve@example.com' } })).statusCode).toBe(201);
    expect((await app.inject({ method: 'POST', url: `/conversations/${conversationId}/members`, headers: { cookie: cookie('ada') }, payload: { email: 'eve@example.com' } })).statusCode).toBe(409);
    await app.inject({ method: 'POST', url: `/conversations/${conversationId}/messages`, headers: { cookie: cookie('ada') }, payload: { content: 'first' } });
    await app.inject({ method: 'POST', url: `/conversations/${conversationId}/messages`, headers: { cookie: cookie('bob') }, payload: { content: 'second' } });
    const firstPage = await app.inject({ method: 'GET', url: `/conversations/${conversationId}/messages?limit=1`, headers: { cookie: cookie('eve') } });
    expect(firstPage.statusCode).toBe(200);
    expect(firstPage.json().messages[0].content).toBe('second');
    expect(firstPage.json().nextCursor).toEqual(expect.any(String));
    const secondPage = await app.inject({ method: 'GET', url: `/conversations/${conversationId}/messages?limit=1&cursor=${firstPage.json().nextCursor}`, headers: { cookie: cookie('eve') } });
    expect(secondPage.json().messages[0].content).toBe('first');

    const oldestCursor = Buffer.from(JSON.stringify({
      createdAt: secondPage.json().messages[0].createdAt,
      id: secondPage.json().messages[0].id,
    })).toString('base64url');
    const sync = await app.inject({ method: 'GET', url: `/conversations/${conversationId}/messages?after=${oldestCursor}`, headers: { cookie: cookie('eve') } });
    expect(sync.statusCode).toBe(200);
    expect(sync.json().messages.map((message: { content: string }) => message.content)).toEqual(['second']);
    expect(sync.json().syncCursor).toEqual(expect.any(String));
  });

  it('upgrades authorized members to WebSocket and closes unauthorized users', async () => {
    const subscriptions: string[] = [];
    let markSubscribed: (() => void) | undefined;
    const subscribed = new Promise<void>((resolve) => { markSubscribed = resolve; });
    const realtimeGateway: RealtimeGateway = {
      subscribe: async (conversationId) => {
        subscriptions.push(conversationId);
        markSubscribed?.();
        return () => undefined;
      },
      handleCommand: async () => undefined,
      publish: async () => undefined,
      close: async () => undefined,
    };
    const { app, cookie } = await setup(realtimeGateway);
    const created = await app.inject({ method: 'POST', url: '/conversations', headers: { cookie: cookie('ada') }, payload: { participantEmail: 'bob@example.com' } });
    const conversationId = created.json().conversation.id as string;
    await app.listen({ host: '127.0.0.1', port: 0 });
    const address = app.server.address();
    if (!address || typeof address === 'string') throw new Error('Expected a TCP server address');
    const url = `ws://127.0.0.1:${address.port}/ws/conversations/${conversationId}`;

    const adaSocket = await openSocket(url, cookie('ada'));
    await subscribed;
    expect(subscriptions).toEqual([conversationId]);
    adaSocket.close();

    expect(await openThenClose(url, cookie('eve'))).toBe(1008);
  });
});
