import { Pool } from 'pg';
import { loadConfig } from '../config.js';

const config = loadConfig();
const pool = new Pool({ connectionString: config.DATABASE_URL });

try {
  const result = await pool.query<{ table_name: string }>(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users'",
  );

  if (result.rowCount !== 1) {
    throw new Error('Expected users table was not created by migrations.');
  }

  console.info('Database migration verification completed successfully.');
} finally {
  await pool.end();
}
