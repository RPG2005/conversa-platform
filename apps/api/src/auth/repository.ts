import type { Pool } from 'pg';
import type { AuthRepository, AuthSessionUser, AuthUser } from './types.js';

const toAuthUser = (row: Record<string, unknown>): AuthUser => ({
  id: row.id as string,
  email: row.email as string,
  displayName: row.display_name as string,
  passwordHash: row.password_hash as string,
  createdAt: row.created_at as Date,
});

export const createAuthRepository = (database: Pool): AuthRepository => ({
  async findUserByEmail(email) {
    const result = await database.query('SELECT id, email, display_name, password_hash, created_at FROM users WHERE email = $1', [email]);
    return result.rows[0] ? toAuthUser(result.rows[0]) : null;
  },
  async createUser(input) {
    const result = await database.query(
      `INSERT INTO users (email, display_name, password_hash)
       VALUES ($1, $2, $3)
       ON CONFLICT (email) DO NOTHING
       RETURNING id, email, display_name, password_hash, created_at`,
      [input.email, input.displayName, input.passwordHash],
    );
    return result.rows[0] ? toAuthUser(result.rows[0]) : null;
  },
  async createSession(input) {
    await database.query('INSERT INTO sessions (user_id, token_hash, expires_at) VALUES ($1, $2, $3)', [
      input.userId,
      input.tokenHash,
      input.expiresAt,
    ]);
  },
  async findSessionUser(tokenHash) {
    const result = await database.query<AuthSessionUser>(
      `SELECT users.id, users.email, users.display_name AS "displayName"
       FROM sessions
       INNER JOIN users ON users.id = sessions.user_id
       WHERE sessions.token_hash = $1 AND sessions.expires_at > NOW()`,
      [tokenHash],
    );
    return result.rows[0] ?? null;
  },
  async deleteSession(tokenHash) {
    await database.query('DELETE FROM sessions WHERE token_hash = $1', [tokenHash]);
  },
});
