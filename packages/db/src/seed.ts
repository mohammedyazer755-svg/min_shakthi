import crypto from 'node:crypto';
import pg from 'pg';

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const parts = storedHash.split('$');
    if (parts.length !== 3 || parts[0] !== 'scrypt') {
      return false;
    }
    const salt = parts[1];
    const hash = parts[2];
    if (!salt || !hash) return false;
    const derived = crypto.scryptSync(password, salt, 64).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(derived, 'hex'), Buffer.from(hash, 'hex'));
  } catch {
    return false;
  }
}

export const TEST_PASSWORD = 'TestPassword123!';

export const TEST_SITES = {
  default: {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Main Pilot Site',
    timezone: 'Asia/Kolkata',
  },
  isolated: {
    id: '22222222-2222-4222-8222-222222222222',
    name: 'Isolated Tenant Site',
    timezone: 'Asia/Kolkata',
  },
};

export const TEST_USERS = {
  admin: {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    email: 'admin@minsakthi.local',
    displayName: 'Lead Admin',
    role: 'admin' as const,
    siteId: TEST_SITES.default.id,
  },
  operator: {
    id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    email: 'operator@minsakthi.local',
    displayName: 'Plant Operator',
    role: 'operator' as const,
    siteId: TEST_SITES.default.id,
  },
  viewer: {
    id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    email: 'viewer@minsakthi.local',
    displayName: 'Audit Viewer',
    role: 'viewer' as const,
    siteId: TEST_SITES.default.id,
  },
  isolatedUser: {
    id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    email: 'other_user@minsakthi.local',
    displayName: 'Tenant User',
    role: 'viewer' as const,
    siteId: TEST_SITES.isolated.id,
  },
};

export const TEST_DEVICES = {
  prototype1: {
    id: 'e1111111-1111-4111-8111-111111111111',
    siteId: TEST_SITES.default.id,
    rawDeviceId: 'prototype1',
    channels: [
      { rawChannelId: 'channel1', slot: 1, label: 'Main Feed (CH01)' },
      { rawChannelId: 'channel2', slot: 2, label: 'Sub Feed (CH02)' },
      { rawChannelId: 'channel3', slot: 3, label: 'HVAC (CH03)' },
      { rawChannelId: 'channel4', slot: 4, label: 'Machinery (CH04)' },
      { rawChannelId: 'channel5', slot: 5, label: 'Lighting (CH05)' },
    ],
  },
  prototype2: {
    id: 'e2222222-2222-4222-8222-222222222222',
    siteId: TEST_SITES.default.id,
    rawDeviceId: 'prototype2',
    channels: [
      { rawChannelId: 'channel1', slot: 1, label: 'Heavy Load (CH01)' },
    ],
  },
  isolated1: {
    id: 'e3333333-3333-4333-8333-333333333333',
    siteId: TEST_SITES.isolated.id,
    rawDeviceId: 'isolated1',
    channels: [
      { rawChannelId: 'channel1', slot: 1, label: 'Isolated Feed (CH01)' },
    ],
  },
};

export async function seedDatabase(databaseUrl?: string): Promise<void> {
  const connectionString = databaseUrl || process.env['DATABASE_URL'];
  if (!connectionString) {
    throw new Error('[DB SEED] DATABASE_URL environment variable is missing.');
  }

  const pool = new pg.Pool({ connectionString });
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Sites
    for (const site of Object.values(TEST_SITES)) {
      await client.query(
        `INSERT INTO sites (id, name, timezone)
         VALUES ($1, $2, $3)
         ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name`,
        [site.id, site.name, site.timezone]
      );
    }

    // 2. Users & Memberships
    const passwordHash = hashPassword(TEST_PASSWORD);
    for (const u of Object.values(TEST_USERS)) {
      await client.query(
        `INSERT INTO users (id, normalized_email, password_hash, display_name)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (normalized_email) DO UPDATE SET password_hash = EXCLUDED.password_hash`,
        [u.id, u.email, passwordHash, u.displayName]
      );

      await client.query(
        `INSERT INTO memberships (user_id, site_id, role)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id, site_id) DO UPDATE SET role = EXCLUDED.role`,
        [u.id, u.siteId, u.role]
      );
    }

    // 3. Devices & Channels
    for (const dev of Object.values(TEST_DEVICES)) {
      await client.query(
        `INSERT INTO devices (id, site_id, raw_device_id)
         VALUES ($1, $2, $3)
         ON CONFLICT (source_namespace, raw_device_id) DO UPDATE SET site_id = EXCLUDED.site_id`,
        [dev.id, dev.siteId, dev.rawDeviceId]
      );

      for (const ch of dev.channels) {
        await client.query(
          `INSERT INTO device_channels (device_id, raw_channel_id, display_slot, label)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (device_id, raw_channel_id) DO UPDATE SET
             display_slot = EXCLUDED.display_slot,
             label = EXCLUDED.label`,
          [dev.id, ch.rawChannelId, ch.slot, ch.label]
        );
      }
    }

    await client.query('COMMIT');
    console.log('[DB SEED] Test identities, sites, and devices seeded successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

if (process.argv[1] && process.argv[1].endsWith('seed.ts')) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[DB SEED] Seed failed:', err);
      process.exit(1);
    });
}
