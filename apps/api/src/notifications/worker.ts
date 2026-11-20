import nodemailer from 'nodemailer';
import type { Redis } from 'ioredis';
import type { NotificationQueue } from './queue.js';

export interface NotificationRecipient {
  id: string;
  email: string;
  displayName: string;
}

export interface NotificationRecipientRepository {
  listRecipients: (conversationId: string, authorId: string) => Promise<NotificationRecipient[]>;
}

export interface NotificationMailer {
  sendMail: (message: { from: string; to: string; subject: string; text: string }) => Promise<unknown>;
}

export const createNotificationMailer = (config: { SMTP_HOST: string; SMTP_PORT: number; SMTP_FROM: string }): NotificationMailer =>
  nodemailer.createTransport({ host: config.SMTP_HOST, port: config.SMTP_PORT, secure: false });

export const createNotificationWorker = (
  queue: NotificationQueue,
  recipients: NotificationRecipientRepository,
  redis: Redis,
  mailer: NotificationMailer,
  config: { SMTP_FROM: string },
) => ({
  async processOne() {
    const job = await queue.dequeue();
    if (!job) return false;
    try {
      const targets = await recipients.listRecipients(job.conversationId, job.authorId);
      for (const target of targets) {
        const online = await redis.scan('0', 'MATCH', `chat:presence:connection:${job.conversationId}:${target.id}:*`, 'COUNT', 1);
        if (online[1].length) continue;
        await mailer.sendMail({
          from: config.SMTP_FROM,
          to: target.email,
          subject: 'Nuevo mensaje en Conversa',
          text: `Hola ${target.displayName}, tienes un nuevo mensaje en una conversación.`,
        });
      }
      return true;
    } catch {
      if ((job.attempt ?? 0) < 2) await queue.retry({ ...job, attempt: (job.attempt ?? 0) + 1 });
      return false;
    }
  },
});
