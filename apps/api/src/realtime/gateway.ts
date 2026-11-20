import type { Redis } from 'ioredis';
import type { WebSocket } from 'ws';
import type { RealtimeCommand } from './protocol.js';

const channel = 'chat:realtime:events';
const presenceTtlSeconds = 60;
const typingTtlSeconds = 8;

export interface MessageCreatedEvent {
  type: 'message.created';
  conversationId: string;
  message: {
    id: string;
    authorId: string;
    content: string;
    attachments: Array<{
      id: string;
      originalName: string;
      contentType: string;
      size: number;
      createdAt: string;
    }>;
    createdAt: string;
  };
}

export interface PresenceChangedEvent {
  type: 'presence.changed';
  conversationId: string;
  userId: string;
  online: boolean;
  expiresAt: string | null;
}

export interface TypingChangedEvent {
  type: 'typing.changed';
  conversationId: string;
  userId: string;
  active: boolean;
  expiresAt: string | null;
}

export type RealtimeEvent = MessageCreatedEvent | PresenceChangedEvent | TypingChangedEvent;

export interface RealtimeGateway {
  subscribe: (conversationId: string, userId: string, connectionId: string, socket: WebSocket) => Promise<() => Promise<void>>;
  handleCommand: (conversationId: string, userId: string, connectionId: string, command: RealtimeCommand) => Promise<void>;
  publish: (event: RealtimeEvent) => Promise<void>;
  close: () => Promise<void>;
}

export const createRealtimeGateway = (publisher: Redis, subscriber: Redis): RealtimeGateway => {
  const connections = new Map<string, Set<WebSocket>>();
  let subscribed = false;

  subscriber.on('message', (_channel, payload) => {
    const event = JSON.parse(payload) as RealtimeEvent;
    for (const socket of connections.get(event.conversationId) ?? []) {
      if (socket.readyState === socket.OPEN) socket.send(JSON.stringify(event));
    }
  });

  const ensureSubscription = async () => {
    if (subscribed) return;
    await subscriber.subscribe(channel);
    subscribed = true;
  };

  const presenceKey = (conversationId: string, userId: string, connectionId: string) =>
    `chat:presence:connection:${conversationId}:${userId}:${connectionId}`;
  const presencePattern = (conversationId: string, userId: string) =>
    `chat:presence:connection:${conversationId}:${userId}:*`;
  const typingKey = (conversationId: string, userId: string) => `chat:typing:${conversationId}:${userId}`;
  const hasPresence = async (conversationId: string, userId: string) => {
    const [nextCursor, keys] = await publisher.scan('0', 'MATCH', presencePattern(conversationId, userId), 'COUNT', 1);
    return nextCursor !== '0' || keys.length > 0;
  };
  const listOnlineUsers = async (conversationId: string) => {
    const users = new Map<string, number>();
    const pattern = `chat:presence:connection:${conversationId}:*`;
    let cursor = '0';
    do {
      const [nextCursor, keys] = await publisher.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = nextCursor;
      await Promise.all(keys.map(async (key) => {
        const [, , , , userId] = key.split(':');
        const ttl = await publisher.ttl(key);
        if (userId && ttl > 0) users.set(userId, Math.max(users.get(userId) ?? 0, ttl));
      }));
    } while (cursor !== '0');
    return users;
  };
  const expiry = (seconds: number) => new Date(Date.now() + seconds * 1_000).toISOString();
  const publish = async (event: RealtimeEvent) => {
    await publisher.publish(channel, JSON.stringify(event));
  };

  return {
    async subscribe(conversationId, userId, connectionId, socket) {
      await ensureSubscription();
      const existingUsers = await listOnlineUsers(conversationId);
      for (const [existingUserId, remainingSeconds] of existingUsers) {
        if (existingUserId === userId) continue;
        socket.send(JSON.stringify({
          type: 'presence.changed', conversationId, userId: existingUserId, online: true,
          expiresAt: expiry(remainingSeconds),
        }));
      }
      await publisher.set(presenceKey(conversationId, userId, connectionId), '1', 'EX', presenceTtlSeconds);
      const subscribers = connections.get(conversationId) ?? new Set<WebSocket>();
      subscribers.add(socket);
      connections.set(conversationId, subscribers);
      await publish({ type: 'presence.changed', conversationId, userId, online: true, expiresAt: expiry(presenceTtlSeconds) });
      return async () => {
        subscribers.delete(socket);
        if (subscribers.size === 0) connections.delete(conversationId);
        await publisher.del(presenceKey(conversationId, userId, connectionId));
        if (!(await hasPresence(conversationId, userId))) {
          await publish({ type: 'presence.changed', conversationId, userId, online: false, expiresAt: null });
        }
      };
    },
    async handleCommand(conversationId, userId, connectionId, command) {
      if (command.type === 'presence.heartbeat') {
        await publisher.set(presenceKey(conversationId, userId, connectionId), '1', 'EX', presenceTtlSeconds);
        await publish({ type: 'presence.changed', conversationId, userId, online: true, expiresAt: expiry(presenceTtlSeconds) });
        return;
      }
      if (command.type === 'typing.started') {
        await publisher.set(typingKey(conversationId, userId), '1', 'EX', typingTtlSeconds);
        await publish({ type: 'typing.changed', conversationId, userId, active: true, expiresAt: expiry(typingTtlSeconds) });
        return;
      }
      await publisher.del(typingKey(conversationId, userId));
      await publish({ type: 'typing.changed', conversationId, userId, active: false, expiresAt: null });
    },
    async publish(event) {
      await publish(event);
    },
    async close() {
      await subscriber.unsubscribe(channel);
      await subscriber.quit();
    },
  };
};
