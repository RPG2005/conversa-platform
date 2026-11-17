import { describe, expect, it, vi } from 'vitest';
import { createNotificationQueue } from '../src/notifications/queue.js';

describe('notification queue', () => {
  it('uses an atomic Redis script and reports duplicate jobs', async () => {
    const evalCommand = vi.fn().mockResolvedValueOnce(1).mockResolvedValueOnce(0);
    const queue = createNotificationQueue({ eval: evalCommand } as never);
    const job = {
      eventId: 'message.created:00000000-0000-4000-8000-000000000001',
      conversationId: '00000000-0000-4000-8000-000000000010',
      messageId: '00000000-0000-4000-8000-000000000001',
      authorId: '00000000-0000-4000-8000-000000000002',
      createdAt: '2026-11-17T16:00:00.000Z',
    };

    expect(await queue.enqueue(job)).toBe(true);
    expect(await queue.enqueue(job)).toBe(false);
    expect(evalCommand).toHaveBeenCalledWith(expect.any(String), 2, `chat:notifications:dedupe:${job.eventId}`, 'chat:notifications:pending', 86_400, JSON.stringify(job));
  });
});
