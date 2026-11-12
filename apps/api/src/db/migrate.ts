import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import { loadConfig } from '../config.js';

const config = loadConfig();
const pool = new Pool({ connectionString: config.DATABASE_URL });
const database = drizzle(pool);

try {
  await migrate(database, { migrationsFolder: './drizzle' });
  console.info('Database migrations completed successfully.');
} finally {
  await pool.end();
}
