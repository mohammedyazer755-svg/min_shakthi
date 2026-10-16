import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  integer,
  numeric,
  jsonb,
  primaryKey,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';

export const users = pgTable(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    normalizedEmail: varchar('normalized_email', { length: 255 }).notNull().unique(),
    passwordHash: text('password_hash').notNull(),
    displayName: varchar('display_name', { length: 255 }).notNull(),
    disabledAt: timestamp('disabled_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('users_email_idx').on(table.normalizedEmail),
  ]
);

export const sites = pgTable('sites', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  timezone: varchar('timezone', { length: 64 }).default('Asia/Kolkata').notNull(),
  retentionPolicyVersion: integer('retention_policy_version').default(1).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const memberships = pgTable(
  'memberships',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    siteId: uuid('site_id')
      .notNull()
      .references(() => sites.id, { onDelete: 'cascade' }),
    role: varchar('role', { length: 32 }).notNull(), // 'viewer' | 'operator' | 'admin'
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.siteId] }),
    index('memberships_site_idx').on(table.siteId),
  ]
);

export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    accessTokenHash: varchar('access_token_hash', { length: 128 }).notNull().unique(),
    refreshFamilyId: uuid('refresh_family_id').notNull(),
    refreshHash: varchar('refresh_hash', { length: 128 }).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    refreshExpiresAt: timestamp('refresh_expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('sessions_user_idx').on(table.userId),
    index('sessions_expires_idx').on(table.expiresAt),
  ]
);

export const devices = pgTable(
  'devices',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    siteId: uuid('site_id')
      .notNull()
      .references(() => sites.id, { onDelete: 'cascade' }),
    sourceNamespace: varchar('source_namespace', { length: 64 }).default('default').notNull(),
    rawDeviceId: varchar('raw_device_id', { length: 64 }).notNull(),
    enabled: boolean('enabled').default(true).notNull(),
    expectedIntervalMs: integer('expected_interval_ms').default(5000).notNull(),
    configVersion: integer('config_version').default(1).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('devices_namespace_raw_idx').on(table.sourceNamespace, table.rawDeviceId),
    index('devices_site_idx').on(table.siteId),
  ]
);

export const deviceChannels = pgTable(
  'device_channels',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    deviceId: uuid('device_id')
      .notNull()
      .references(() => devices.id, { onDelete: 'cascade' }),
    rawChannelId: varchar('raw_channel_id', { length: 64 }).notNull(),
    displaySlot: integer('display_slot'), // 1..5 or null
    label: varchar('label', { length: 255 }).notNull(),
    enabled: boolean('enabled').default(true).notNull(),
    expectedIntervalMs: integer('expected_interval_ms').default(5000).notNull(),
  },
  (table) => [
    uniqueIndex('device_channels_dev_raw_idx').on(table.deviceId, table.rawChannelId),
  ]
);

export const telemetrySamples = pgTable(
  'telemetry_samples',
  {
    eventId: uuid('event_id').primaryKey(),
    siteId: uuid('site_id').notNull(),
    deviceId: uuid('device_id').notNull(),
    channelId: uuid('channel_id').notNull(),
    receivedAt: timestamp('received_at', { withTimezone: true }).notNull(),
    serverEpoch: uuid('server_epoch').notNull(),
    sequence: numeric('sequence', { precision: 20, scale: 0 }).notNull(),
    voltage: numeric('voltage', { precision: 12, scale: 4 }).notNull(),
    current: numeric('current', { precision: 12, scale: 4 }).notNull(),
    power: numeric('power', { precision: 14, scale: 4 }).notNull(),
    energyRaw: numeric('energy_raw', { precision: 30, scale: 12 }).notNull(),
    energyToken: varchar('energy_token', { length: 64 }).notNull(),
    frequency: numeric('frequency', { precision: 8, scale: 4 }).notNull(),
    qos: integer('qos').default(0).notNull(),
    retained: boolean('retained').default(false).notNull(),
    suspectDuplicate: boolean('suspect_duplicate').default(false).notNull(),
    qualityJson: jsonb('quality_json').default([]).notNull(),
    configVersion: integer('config_version').default(1).notNull(),
    deviceTime: timestamp('device_time', { withTimezone: true }),
  },
  (table) => [
    index('telemetry_dev_chan_recv_idx').on(table.deviceId, table.channelId, table.receivedAt),
    uniqueIndex('telemetry_epoch_seq_idx').on(table.serverEpoch, table.sequence),
  ]
);

export const latestData = pgTable(
  'latest_data',
  {
    deviceId: uuid('device_id').notNull(),
    channelId: uuid('channel_id').notNull(),
    eventId: uuid('event_id').notNull(),
    receivedAt: timestamp('received_at', { withTimezone: true }).notNull(),
    valuesJson: jsonb('values_json').notNull(),
    qualityJson: jsonb('quality_json').default([]).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.deviceId, table.channelId] }),
  ]
);

export const spoolCheckpoints = pgTable('spool_checkpoints', {
  consumerId: varchar('consumer_id', { length: 64 }).primaryKey(),
  lastCommittedOffset: numeric('last_committed_offset', { precision: 20, scale: 0 }).notNull(),
  lastEventId: uuid('last_event_id'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

