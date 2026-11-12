import type { Redis } from 'ioredis';
import type { WebSocket } from 'ws';

const channel = 'chat:realtime:events';

export interface MessageCreatedEvent {
  type: 'message.created';
  conversationId: string;
  message: {
    id: string;
    authorId: string;
    content: string;
    createdAt: string;
  };
}

export interface RealtimeGateway {
  subscribe: (conversationId: string, socket: WebSocket) => Promise<() => void>;
  publish: (event: MessageCreatedEvent) => Promise<void>;
  close: () => Promise<void>;
}

export const createRealtimeGateway = (publisher: Redis, subscriber: Redis): RealtimeGateway => {
  const connections = new Map<string, Set<WebSocket>>();
  let subscribed = false;

  subscriber.on('message', (_channel, payload) => {
    const event = JSON.parse(payload) as MessageCreatedEvent;
    for (const socket of connections.get(event.conversationId) ?? []) {
      if (socket.readyState === socket.OPEN) socket.send(JSON.stringify(event));
    }
  });

  const ensureSubscription = async () => {
    if (subscribed) return;
    await subscriber.subscribe(channel);
    subscribed = true;
  };

  return {
    async subscribe(conversationId, socket) {
      await ensureSubscription();
      const subscribers = connections.get(conversationId) ?? new Set<WebSocket>();
      subscribers.add(socket);
      connections.set(conversationId, subscribers);
      return () => {
        subscribers.delete(socket);
        if (subscribers.size === 0) connections.delete(conversationId);
      };
    },
    async publish(event) {
      await publisher.publish(channel, JSON.stringify(event));
    },
    async close() {
      await subscriber.unsubscribe(channel);
      await subscriber.quit();
    },
  };
};
