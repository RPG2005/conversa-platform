import { describe, expect, it, vi } from 'vitest';
import { createNotificationWorker } from '../src/notifications/worker.js';

const job = { eventId: 'message.created:1', conversationId: 'conversation-1', messageId: 'message-1', authorId: 'author-1', createdAt: '2026-11-18T10:00:00.000Z' };

describe('notification worker', () => {
  it('sends only to disconnected recipients', async () => {
    const queue = { dequeue: vi.fn().mockResolvedValue(job), retry: vi.fn() };
    const listRecipients = vi.fn().mockResolvedValue([{ id: 'offline', email: 'offline@example.test', displayName: 'Offline' }, { id: 'online', email: 'online@example.test', displayName: 'Online' }]);
    const scan = vi.fn().mockResolvedValueOnce(['0', []]).mockResolvedValueOnce(['0', ['presence']]);
    const sendMail = vi.fn().mockResolvedValue(undefined);
    const worker = createNotificationWorker(queue as never, { listRecipients }, { scan } as never, { sendMail }, { SMTP_FROM: 'notifications@chat.local' });
    expect(await worker.processOne()).toBe(true);
    expect(sendMail).toHaveBeenCalledTimes(1);
    expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({ to: 'offline@example.test' }));
  });

  it('requeues the job when delivery fails', async () => {
    const queue = { dequeue: vi.fn().mockResolvedValue(job), retry: vi.fn().mockResolvedValue(undefined) };
    const worker = createNotificationWorker(queue as never, { listRecipients: vi.fn().mockRejectedValue(new Error('database unavailable')) }, { scan: vi.fn() } as never, { sendMail: vi.fn() }, { SMTP_FROM: 'notifications@chat.local' });
    expect(await worker.processOne()).toBe(false);
    expect(queue.retry).toHaveBeenCalledWith({ ...job, attempt: 1 });
  });
});
