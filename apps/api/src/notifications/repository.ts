import type { Pool } from 'pg';
import type { NotificationRecipientRepository } from './worker.js';

export const createNotificationRecipientRepository = (database: Pool): NotificationRecipientRepository => ({
  async listRecipients(conversationId, authorId) {
    const result = await database.query<{ id: string; email: string; display_name: string }>(
      `SELECT users.id, users.email, users.display_name
       FROM conversation_members
       INNER JOIN users ON users.id = conversation_members.user_id
       WHERE conversation_members.conversation_id = $1 AND users.id <> $2`,
      [conversationId, authorId],
    );
    return result.rows.map((row) => ({ id: row.id, email: row.email, displayName: row.display_name }));
  },
});
