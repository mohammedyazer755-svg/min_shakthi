-- 0001_initial_schema.sql: MIN-SAKTHI V2 Initial Database Schema
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  normalized_email VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  disabled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS users_email_idx ON users(normalized_email);

CREATE TABLE IF NOT EXISTS sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  timezone VARCHAR(64) NOT NULL DEFAULT 'Asia/Kolkata',
  retention_policy_version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS memberships (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  role VARCHAR(32) NOT NULL, -- 'viewer' | 'operator' | 'admin'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, site_id)
);

CREATE INDEX IF NOT EXISTS memberships_site_idx ON memberships(site_id);

CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  access_token_hash VARCHAR(128) NOT NULL UNIQUE,
  refresh_family_id UUID NOT NULL,
  refresh_hash VARCHAR(128) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  refresh_expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions(user_id);
CREATE INDEX IF NOT EXISTS sessions_expires_idx ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  source_namespace VARCHAR(64) NOT NULL DEFAULT 'default',
  raw_device_id VARCHAR(64) NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  expected_interval_ms INTEGER NOT NULL DEFAULT 5000,
  config_version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT devices_namespace_raw_unique UNIQUE (source_namespace, raw_device_id)
);

CREATE INDEX IF NOT EXISTS devices_site_idx ON devices(site_id);

CREATE TABLE IF NOT EXISTS device_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  raw_channel_id VARCHAR(64) NOT NULL,
  display_slot INTEGER,
  label VARCHAR(255) NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  expected_interval_ms INTEGER NOT NULL DEFAULT 5000,
  CONSTRAINT device_channels_raw_unique UNIQUE (device_id, raw_channel_id)
);

CREATE TABLE IF NOT EXISTS telemetry_samples (
  event_id UUID PRIMARY KEY,
  site_id UUID NOT NULL,
  device_id UUID NOT NULL,
  channel_id UUID NOT NULL,
  received_at TIMESTAMPTZ NOT NULL,
  server_epoch UUID NOT NULL,
  sequence NUMERIC(20, 0) NOT NULL,
  voltage NUMERIC(12, 4) NOT NULL,
  current NUMERIC(12, 4) NOT NULL,
  power NUMERIC(14, 4) NOT NULL,
  energy_raw NUMERIC(30, 12) NOT NULL,
  energy_token VARCHAR(64) NOT NULL,
  frequency NUMERIC(8, 4) NOT NULL,
  qos INTEGER NOT NULL DEFAULT 0,
  retained BOOLEAN NOT NULL DEFAULT FALSE,
  suspect_duplicate BOOLEAN NOT NULL DEFAULT FALSE,
  quality_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  config_version INTEGER NOT NULL DEFAULT 1,
  device_time TIMESTAMPTZ,
  CONSTRAINT telemetry_epoch_seq_unique UNIQUE (server_epoch, sequence)
);

CREATE INDEX IF NOT EXISTS telemetry_dev_chan_recv_idx ON telemetry_samples(device_id, channel_id, received_at);

CREATE TABLE IF NOT EXISTS latest_data (
  device_id UUID NOT NULL,
  channel_id UUID NOT NULL,
  event_id UUID NOT NULL,
  received_at TIMESTAMPTZ NOT NULL,
  values_json JSONB NOT NULL,
  quality_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  PRIMARY KEY (device_id, channel_id)
);

CREATE TABLE IF NOT EXISTS spool_checkpoints (
  consumer_id VARCHAR(64) PRIMARY KEY,
  last_committed_offset NUMERIC(20, 0) NOT NULL,
  last_event_id UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
