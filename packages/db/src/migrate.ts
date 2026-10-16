import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function runMigrations(databaseUrl?: string): Promise<{ applied: string[] }> {
  const connectionString = databaseUrl || process.env['DATABASE_URL'];
  const migrationsDir = fs.existsSync(path.resolve(__dirname, '../migrations'))
    ? path.resolve(__dirname, '../migrations')
    : path.resolve(__dirname, '../../migrations');

  if (!fs.existsSync(migrationsDir)) {
    console.warn(`[DB MIGRATE] Migrations directory ${migrationsDir} not found.`);
    return { applied: [] };
  }

  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  if (!connectionString) {
    console.log(`[DB MIGRATE] No DATABASE_URL specified. Validating ${files.length} migration SQL files...`);
    for (const file of files) {
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
      if (!sql.trim()) {
        throw new Error(`[DB MIGRATE] Empty migration file: ${file}`);
      }
      console.log(`[DB MIGRATE] Validated migration script: ${file} (${sql.length} bytes)`);
    }
    return { applied: files };
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
if (process.argv[1] && (process.argv[1].endsWith('migrate.ts') || process.argv[1].endsWith('migrate.js'))) {
  runMigrations()
    .then(({ applied }) => {
      console.log(`[DB MIGRATE] Done. ${applied.length} migrations validated/applied.`);
      process.exit(0);
    })
    .catch((err) => {
      console.error('[DB MIGRATE] Migration failed:', err);
      process.exit(1);
    });
}

