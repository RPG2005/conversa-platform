import type { Redis } from 'ioredis';

const queueKey = 'chat:notifications:pending';
const deduplicationTtlSeconds = 24 * 60 * 60;

export interface NotificationJob {
  eventId: string;
  conversationId: string;
  messageId: string;
  authorId: string;
  createdAt: string;
}

export interface NotificationQueue {
  enqueue: (job: NotificationJob) => Promise<boolean>;
}

const enqueueOnceScript = `
  if redis.call('SET', KEYS[1], '1', 'EX', ARGV[1], 'NX') then
    redis.call('RPUSH', KEYS[2], ARGV[2])
    return 1
  end
  return 0
`;

export const createNotificationQueue = (redis: Redis): NotificationQueue => ({
  async enqueue(job) {
    const inserted = await redis.eval(
      enqueueOnceScript,
      2,
      `chat:notifications:dedupe:${job.eventId}`,
      queueKey,
      deduplicationTtlSeconds,
      JSON.stringify(job),
    );
    return Number(inserted) === 1;
  },
});
