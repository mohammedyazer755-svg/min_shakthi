-- Cloud processes share durable telemetry and application documents through Postgres.
-- Raw device/channel identifiers are preserved in the versioned protocol payload.
CREATE TABLE IF NOT EXISTS runtime_telemetry (
  event_id UUID PRIMARY KEY,
  site_id UUID NOT NULL REFERENCES sites(id),
  device_id VARCHAR(64) NOT NULL,
  channel_id VARCHAR(64) NOT NULL,
  received_at TIMESTAMPTZ NOT NULL,
  payload JSONB NOT NULL
);
CREATE INDEX IF NOT EXISTS runtime_telemetry_history_idx
  ON runtime_telemetry(site_id, device_id, received_at DESC, event_id);
CREATE INDEX IF NOT EXISTS runtime_telemetry_latest_idx
  ON runtime_telemetry(site_id, device_id, channel_id, received_at DESC);
CREATE TABLE IF NOT EXISTS runtime_documents (
  kind VARCHAR(32) NOT NULL,
  id TEXT NOT NULL,
  site_id UUID REFERENCES sites(id),
  payload JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY(kind, id)
);
CREATE INDEX IF NOT EXISTS runtime_documents_site_idx ON runtime_documents(kind, site_id);
