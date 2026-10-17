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

export const alertRules = pgTable(
  'alert_rules',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    siteId: uuid('site_id').notNull().references(() => sites.id, { onDelete: 'cascade' }),
    deviceId: uuid('device_id').notNull().references(() => devices.id, { onDelete: 'cascade' }),
    channelId: uuid('channel_id').references(() => deviceChannels.id, { onDelete: 'cascade' }),
    metric: varchar('metric', { length: 32 }).notNull(), // 'voltage' | 'current' | 'power' | 'frequency'
    operator: varchar('operator', { length: 16 }).notNull(), // 'gt' | 'lt' | 'gte' | 'lte'
    threshold: numeric('threshold', { precision: 14, scale: 4 }).notNull(),
    hysteresis: numeric('hysteresis', { precision: 14, scale: 4 }).default('0').notNull(),
    debounceMs: integer('debounce_ms').default(0).notNull(),
    severity: varchar('severity', { length: 16 }).default('warning').notNull(),
    enabled: boolean('enabled').default(true).notNull(),
    version: integer('version').default(1).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('alert_rules_dev_enabled_idx').on(table.deviceId, table.enabled),
    index('alert_rules_site_idx').on(table.siteId),
  ]
);

export const alerts = pgTable(
  'alerts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    ruleId: uuid('rule_id').notNull().references(() => alertRules.id, { onDelete: 'cascade' }),
    deviceId: uuid('device_id').notNull(),
    channelId: uuid('channel_id'),
    openedAt: timestamp('opened_at', { withTimezone: true }).defaultNow().notNull(),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).defaultNow().notNull(),
    state: varchar('state', { length: 32 }).default('open').notNull(), // 'open' | 'acknowledged' | 'resolved'
    triggerEventId: uuid('trigger_event_id'),
    triggerValue: numeric('trigger_value', { precision: 14, scale: 4 }).notNull(),
    violationStartAt: timestamp('violation_start_at', { withTimezone: true }).notNull(),
  },
  (table) => [
    index('alerts_rule_dev_state_idx').on(table.ruleId, table.deviceId, table.state),
    index('alerts_opened_idx').on(table.openedAt),
  ]
);

export const alertAcknowledgements = pgTable(
  'alert_acknowledgements',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    alertId: uuid('alert_id').notNull().references(() => alerts.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    ackAt: timestamp('ack_at', { withTimezone: true }).defaultNow().notNull(),
    note: text('note'),
  },
  (table) => [
    uniqueIndex('alert_ack_unique').on(table.alertId, table.userId),
  ]
);

export const auditLog = pgTable(
  'audit_log',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    siteId: uuid('site_id').notNull().references(() => sites.id, { onDelete: 'cascade' }),
    actorId: uuid('actor_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    action: varchar('action', { length: 64 }).notNull(),
    target: varchar('target', { length: 128 }).notNull(),
    beforeJson: jsonb('before_json'),
    afterJson: jsonb('after_json'),
    at: timestamp('at', { withTimezone: true }).defaultNow().notNull(),
    requestId: varchar('request_id', { length: 64 }),
  },
  (table) => [
    index('audit_log_site_at_idx').on(table.siteId, table.at),
  ]
);

export const userPreferences = pgTable('user_preferences', {
  userId: uuid('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  timezone: varchar('timezone', { length: 64 }).default('Asia/Kolkata').notNull(),
  preferredDeviceId: uuid('preferred_device_id'),
  displayPreferences: jsonb('display_preferences').default({}).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const mappingVersions = pgTable(
  'mapping_versions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    deviceId: uuid('device_id').notNull().references(() => devices.id, { onDelete: 'cascade' }),
    version: integer('version').notNull(),
    effectiveFrom: timestamp('effective_from', { withTimezone: true }).defaultNow().notNull(),
    mappingJson: jsonb('mapping_json').notNull(),
    actorId: uuid('actor_id').notNull().references(() => users.id),
  },
  (table) => [
    uniqueIndex('mapping_dev_version_unique').on(table.deviceId, table.version),
  ]
);

export const counterEpochs = pgTable(
  'counter_epochs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    deviceId: uuid('device_id').notNull().references(() => devices.id, { onDelete: 'cascade' }),
    channelId: uuid('channel_id').notNull(),
    startAt: timestamp('start_at', { withTimezone: true }).notNull(),
    endAt: timestamp('end_at', { withTimezone: true }),
    reason: varchar('reason', { length: 64 }).notNull(),
    unit: varchar('unit', { length: 32 }).default('unknown').notNull(),
    semantics: varchar('semantics', { length: 32 }).default('cumulative').notNull(),
    configVersion: integer('config_version').default(1).notNull(),
    verifiedBy: uuid('verified_by').references(() => users.id),
  },
  (table) => [
    index('counter_epochs_dev_chan_idx').on(table.deviceId, table.channelId, table.startAt),
  ]
);

export const measurementConfigs = pgTable(
  'measurement_configs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    deviceId: uuid('device_id').notNull().references(() => devices.id, { onDelete: 'cascade' }),
    version: integer('version').default(1).notNull(),
    energyUnit: varchar('energy_unit', { length: 32 }).default('unknown').notNull(),
    semantics: varchar('semantics', { length: 32 }).default('cumulative').notNull(),
    wrapModulus: numeric('wrap_modulus', { precision: 30, scale: 12 }),
    signSupport: varchar('sign_support', { length: 16 }).default('unsigned').notNull(),
    calibrationEvidence: jsonb('calibration_evidence'),
    verifiedBy: uuid('verified_by').references(() => users.id),
    verifiedAt: timestamp('verified_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('measurement_configs_dev_ver_unique').on(table.deviceId, table.version),
  ]
);

export const tariffVersions = pgTable(
  'tariff_versions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    siteId: uuid('site_id').notNull().references(() => sites.id, { onDelete: 'cascade' }),
    currency: varchar('currency', { length: 16 }).default('INR').notNull(),
    effectiveFrom: timestamp('effective_from', { withTimezone: true }).notNull(),
    toAt: timestamp('to_at', { withTimezone: true }),
    method: varchar('method', { length: 32 }).default('flat').notNull(),
    rulesJson: jsonb('rules_json').notNull(),
    sourceReference: text('source_reference'),
    approvedBy: uuid('approved_by').references(() => users.id),
    approvedAt: timestamp('approved_at', { withTimezone: true }),
  },
  (table) => [
    index('tariff_versions_site_from_idx').on(table.siteId, table.effectiveFrom),
  ]
);

export const reports = pgTable(
  'reports',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    siteId: uuid('site_id').notNull().references(() => sites.id, { onDelete: 'cascade' }),
    deviceId: uuid('device_id').notNull().references(() => devices.id, { onDelete: 'cascade' }),
    periodStart: timestamp('period_start', { withTimezone: true }).notNull(),
    periodEnd: timestamp('period_end', { withTimezone: true }).notNull(),
    timezone: varchar('timezone', { length: 64 }).notNull(),
    cutoff: timestamp('cutoff', { withTimezone: true }).notNull(),
    configVersion: integer('config_version').default(1).notNull(),
    tariffVersion: uuid('tariff_version').references(() => tariffVersions.id),
    revision: integer('revision').default(1).notNull(),
    coverage: jsonb('coverage').notNull(),
    totalsJson: jsonb('totals_json').notNull(),
    status: varchar('status', { length: 32 }).default('preliminary').notNull(),
    generatedAt: timestamp('generated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('reports_dev_period_rev_unique').on(table.deviceId, table.periodStart, table.revision),
    index('reports_dev_period_idx').on(table.deviceId, table.periodStart),
  ]
);

export const incidents = pgTable(
  'incidents',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    siteId: uuid('site_id').notNull().references(() => sites.id, { onDelete: 'cascade' }),
    deviceId: varchar('device_id', { length: 64 }).notNull(),
    channelId: varchar('channel_id', { length: 64 }),
    type: varchar('type', { length: 32 }).notNull(), // 'electrical_breach' | 'device_interruption' | 'transport_outage'
    severity: varchar('severity', { length: 16 }).default('warning').notNull(),
    state: varchar('state', { length: 32 }).default('evaluating').notNull(), // 'evaluating' | 'resolved' | 'acknowledged'
    title: varchar('title', { length: 255 }).notNull(),
    summary: text('summary').notNull(),
    causeConfirmation: varchar('cause_confirmation', { length: 64 }).notNull(),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
    endedAt: timestamp('ended_at', { withTimezone: true }),
    durationMs: integer('duration_ms'),
    evidenceJson: jsonb('evidence_json').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('incidents_site_dev_state_idx').on(table.siteId, table.deviceId, table.state),
    index('incidents_site_started_idx').on(table.siteId, table.startedAt),
  ]
);

export const incidentAcknowledgements = pgTable(
  'incident_acknowledgements',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    incidentId: uuid('incident_id').notNull().references(() => incidents.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    ackAt: timestamp('ack_at', { withTimezone: true }).defaultNow().notNull(),
    note: text('note'),
  },
  (table) => [
    uniqueIndex('incident_ack_unique').on(table.incidentId, table.userId),
  ]
);


