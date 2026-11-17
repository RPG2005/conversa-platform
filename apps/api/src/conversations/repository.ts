import type { Pool } from 'pg';
import type { Attachment, Conversation, ConversationRepository, Message, MessageAttachment } from './types.js';

const toConversation = (row: Record<string, unknown>): Conversation => ({
  id: row.id as string,
  createdAt: row.created_at as Date,
  updatedAt: row.updated_at as Date,
});

const toMessage = (row: Record<string, unknown>): Message => ({
  id: row.id as string,
  conversationId: row.conversation_id as string,
  authorId: row.author_id as string,
  content: row.content as string,
  attachments: [],
  createdAt: row.created_at as Date,
});

const toMessageAttachment = (row: Record<string, unknown>): MessageAttachment => ({
  id: row.id as string,
  originalName: row.original_name as string,
  contentType: row.content_type as string,
  size: row.size as number,
  createdAt: row.created_at as Date,
});

const toAttachment = (row: Record<string, unknown>): Attachment => ({
  id: row.id as string, objectKey: row.object_key as string, originalName: row.original_name as string,
  contentType: row.content_type as string, size: row.size as number, status: row.status as string, createdAt: row.created_at as Date,
});

const withMessageAttachments = async (database: Pool, messages: Message[]) => {
  if (!messages.length) return messages;
  const result = await database.query<Record<string, unknown>>(
    `SELECT message_id, id, original_name, content_type, size, created_at
     FROM attachments WHERE message_id = ANY($1::uuid[]) AND status = 'uploaded'
     ORDER BY created_at ASC, id ASC`,
    [messages.map((message) => message.id)],
  );
  const grouped = new Map<string, MessageAttachment[]>();
  for (const row of result.rows) {
    const items = grouped.get(row.message_id as string) ?? [];
    items.push(toMessageAttachment(row));
    grouped.set(row.message_id as string, items);
  }
  return messages.map((message) => ({ ...message, attachments: grouped.get(message.id) ?? [] }));
};

export const createConversationRepository = (database: Pool): ConversationRepository => ({
  async findUserIdByEmail(email) {
    const result = await database.query<{ id: string }>('SELECT id FROM users WHERE email = $1', [email]);
    return result.rows[0]?.id ?? null;
  },
  async createConversation(creatorId, participantId) {
    const client = await database.connect();
    try {
      await client.query('BEGIN');
      const conversation = await client.query(
        'INSERT INTO conversations (created_by) VALUES ($1) RETURNING id, created_at, updated_at',
        [creatorId],
      );
      const created = toConversation(conversation.rows[0]);
      await client.query('INSERT INTO conversation_members (conversation_id, user_id) VALUES ($1, $2), ($1, $3)', [
        created.id,
        creatorId,
        participantId,
      ]);
      await client.query('COMMIT');
      return created;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },
  async listConversations(userId) {
    const result = await database.query(
      `SELECT conversations.id, conversations.created_at, conversations.updated_at
       FROM conversations
       INNER JOIN conversation_members ON conversation_members.conversation_id = conversations.id
       WHERE conversation_members.user_id = $1
       ORDER BY conversations.updated_at DESC, conversations.id DESC`,
      [userId],
    );
    return result.rows.map(toConversation);
  },
  async isMember(conversationId, userId) {
    const result = await database.query(
      'SELECT 1 FROM conversation_members WHERE conversation_id = $1 AND user_id = $2',
      [conversationId, userId],
    );
    return result.rowCount === 1;
  },
  async addMember(conversationId, userId) {
    const result = await database.query(
      'INSERT INTO conversation_members (conversation_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING conversation_id',
      [conversationId, userId],
    );
    return result.rowCount === 1;
  },
  async createMessage(input) {
    const client = await database.connect();
    try {
      await client.query('BEGIN');
      const result = await client.query(
        'INSERT INTO messages (conversation_id, author_id, content) VALUES ($1, $2, $3) RETURNING id, conversation_id, author_id, content, created_at',
        [input.conversationId, input.authorId, input.content],
      );
      if (input.attachmentIds?.length) {
        const attached = await client.query<Record<string, unknown>>(
          `UPDATE attachments SET message_id = $1
           WHERE id = ANY($2::uuid[]) AND conversation_id = $3 AND uploader_id = $4
             AND status = 'uploaded' AND message_id IS NULL
           RETURNING id, original_name, content_type, size, created_at`,
          [result.rows[0].id, input.attachmentIds, input.conversationId, input.authorId],
        );
        if (attached.rowCount !== input.attachmentIds.length) throw new Error('Invalid message attachments');
        const message = toMessage(result.rows[0]);
        message.attachments = attached.rows.map(toMessageAttachment);
        await client.query('UPDATE conversations SET updated_at = NOW() WHERE id = $1', [input.conversationId]);
        await client.query('COMMIT');
        return message;
      }
      await client.query('UPDATE conversations SET updated_at = NOW() WHERE id = $1', [input.conversationId]);
      await client.query('COMMIT');
      return toMessage(result.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },
  async listMessages({ conversationId, limit, cursor }) {
    const parameters: unknown[] = [conversationId];
    const cursorClause = cursor
      ? (() => {
          parameters.push(cursor.createdAt, cursor.id);
          return 'AND (created_at, id) < ($2::timestamptz, $3::uuid)';
        })()
      : '';
    parameters.push(limit);
    const result = await database.query(
      `SELECT id, conversation_id, author_id, content, created_at
       FROM messages
       WHERE conversation_id = $1 ${cursorClause}
       ORDER BY created_at DESC, id DESC
       LIMIT $${parameters.length}`,
      parameters,
    );
    return withMessageAttachments(database, result.rows.map(toMessage));
  },
  async listMessagesAfter({ conversationId, limit, cursor }) {
    const result = await database.query(
      `SELECT id, conversation_id, author_id, content, created_at
       FROM messages
       WHERE conversation_id = $1 AND (created_at, id) > ($2::timestamptz, $3::uuid)
       ORDER BY created_at ASC, id ASC
       LIMIT $4`,
      [conversationId, cursor.createdAt, cursor.id, limit],
    );
    return withMessageAttachments(database, result.rows.map(toMessage));
  },
  async createAttachment(input) {
    const result = await database.query(
      `INSERT INTO attachments (conversation_id, uploader_id, object_key, original_name, content_type, size)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, object_key, original_name, content_type, size, status, created_at`,
      [input.conversationId, input.uploaderId, input.objectKey, input.originalName, input.contentType, input.size],
    );
    return toAttachment(result.rows[0]);
  },
  async findAttachment(attachmentId, conversationId, uploaderId) {
    const result = await database.query(
      `SELECT id, object_key, original_name, content_type, size, status, created_at FROM attachments
       WHERE id = $1 AND conversation_id = $2 AND uploader_id = $3`, [attachmentId, conversationId, uploaderId],
    );
    return result.rows[0] ? toAttachment(result.rows[0]) : null;
  },
  async markAttachmentUploaded(attachmentId) {
    const result = await database.query(
      `UPDATE attachments SET status = 'uploaded' WHERE id = $1 RETURNING id, object_key, original_name, content_type, size, status, created_at`, [attachmentId],
    );
    return toAttachment(result.rows[0]);
  },
  async findUploadedAttachment(attachmentId, conversationId) {
    const result = await database.query(
      `SELECT id, object_key, original_name, content_type, size, status, created_at FROM attachments
       WHERE id = $1 AND conversation_id = $2 AND status = 'uploaded'`, [attachmentId, conversationId],
    );
    return result.rows[0] ? toAttachment(result.rows[0]) : null;
  },
});
