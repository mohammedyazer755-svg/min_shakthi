import pg from 'pg';
import { runMigrations, hashPassword } from '../packages/db/dist/index.js';

const databaseUrl = process.env.DATABASE_URL_UNPOOLED || process.env.POSTGRES_URL_NON_POOLING || process.env.DATABASE_URL;
if (!databaseUrl || !process.env.BOOTSTRAP_ADMIN_PASSWORD) throw new Error('Database and bootstrap password must be supplied securely.');
await runMigrations(databaseUrl);
const pool = new pg.Pool({ connectionString:databaseUrl });
const client = await pool.connect();
try {
  await client.query('BEGIN');
  const siteId = '11111111-1111-4111-8111-111111111111';
  await client.query("INSERT INTO sites(id,name,timezone) VALUES($1,'MIN-SAKTHI','Asia/Kolkata') ON CONFLICT(id) DO NOTHING",[siteId]);
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL || 'admin@minsakthi.local';
  const result = await client.query(`INSERT INTO users(normalized_email,password_hash,display_name) VALUES($1,$2,'Administrator')
    ON CONFLICT(normalized_email) DO UPDATE SET normalized_email=EXCLUDED.normalized_email RETURNING id`,[email,hashPassword(process.env.BOOTSTRAP_ADMIN_PASSWORD)]);
  await client.query("INSERT INTO memberships(user_id,site_id,role) VALUES($1,$2,'admin') ON CONFLICT DO NOTHING",[result.rows[0].id,siteId]);
  for (const rawId of ['prototype1','prototype2']) {
    const device = await client.query(`INSERT INTO devices(site_id,raw_device_id) VALUES($1,$2)
      ON CONFLICT(source_namespace,raw_device_id) DO UPDATE SET raw_device_id=EXCLUDED.raw_device_id RETURNING id`,[siteId,rawId]);
    for (let slot=1;slot<=5;slot++) {
      await client.query(`INSERT INTO device_channels(device_id,raw_channel_id,display_slot,label) VALUES($1,$2,$3,$4)
        ON CONFLICT(device_id,raw_channel_id) DO NOTHING`,[device.rows[0].id,`channel${slot}`,slot,`Channel ${slot}`]);
    }
  }
  await client.query('COMMIT');
  console.log('Cloud schema, admin, and registered device mappings are ready. No sample telemetry was inserted.');
} catch (error) { await client.query('ROLLBACK'); throw error; }
finally { client.release(); await pool.end(); }
