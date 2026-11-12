import type { Pool } from 'pg';
import type { Conversation, ConversationRepository, Message } from './types.js';

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
  createdAt: row.created_at as Date,
});

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
    return result.rows.map(toMessage);
  },
});
