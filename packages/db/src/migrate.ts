import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function runMigrations(databaseUrl?: string): Promise<{ applied: string[] }> {
  const connectionString = databaseUrl || process.env['DATABASE_URL'];
  if (!connectionString) {
    throw new Error('[DB MIGRATE] DATABASE_URL environment variable is missing.');
  }

  const pool = new pg.Pool({ connectionString });
  const client = await pool.connect();
  const applied: string[] = [];

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // Look for migrations in packages/db/migrations
    const migrationsDir = path.resolve(__dirname, '../../migrations');
    if (!fs.existsSync(migrationsDir)) {
      console.warn(`[DB MIGRATE] Migrations directory ${migrationsDir} not found.`);
      return { applied };
    }

    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const { rows } = await client.query(
        'SELECT name FROM schema_migrations WHERE name = $1',
        [file]
      );
      if (rows.length === 0) {
        console.log(`[DB MIGRATE] Applying migration: ${file}...`);
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
        await client.query('BEGIN');
        try {
          await client.query(sql);
          await client.query(
            'INSERT INTO schema_migrations (name) VALUES ($1)',
            [file]
          );
          await client.query('COMMIT');
          applied.push(file);
          console.log(`[DB MIGRATE] Successfully applied: ${file}`);
        } catch (err) {
          await client.query('ROLLBACK');
          throw err;
        }
      } else {
        console.log(`[DB MIGRATE] Migration already applied: ${file}`);
      }
    }

    return { applied };
  } finally {
    client.release();
    await pool.end();
  }
}

// Direct CLI execution
if (process.argv[1] && process.argv[1].endsWith('migrate.ts')) {
  runMigrations()
    .then(({ applied }) => {
      console.log(`[DB MIGRATE] Done. ${applied.length} new migrations applied.`);
      process.exit(0);
    })
    .catch((err) => {
      console.error('[DB MIGRATE] Migration failed:', err);
      process.exit(1);
    });
}
