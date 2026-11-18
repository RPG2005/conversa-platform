import { Pool } from 'pg';
import { loadConfig } from '../config.js';

const config = loadConfig();
const pool = new Pool({ connectionString: config.DATABASE_URL });

try {
  const expectedTables = ['users', 'sessions', 'notification_preferences', 'conversations', 'conversation_members', 'messages', 'attachments'];
  const result = await pool.query<{ table_name: string }>(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = ANY($1)",
    [expectedTables],
  );
  const existingTables = new Set(result.rows.map((row) => row.table_name));
  const missingTables = expectedTables.filter((table) => !existingTables.has(table));

  if (missingTables.length > 0) {
    throw new Error(`Expected tables were not created by migrations: ${missingTables.join(', ')}`);
  }

  console.info('Database migration verification completed successfully.');
} finally {
  await pool.end();
}
