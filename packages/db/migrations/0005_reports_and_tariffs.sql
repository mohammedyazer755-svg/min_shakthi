-- Migration 0005: Mapping versions, counter epochs, tariffs, and reports
CREATE TABLE IF NOT EXISTS mapping_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  effective_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  mapping_json JSONB NOT NULL,
  actor_id UUID NOT NULL REFERENCES users(id),
  CONSTRAINT mapping_dev_version_unique UNIQUE(device_id, version)
);

CREATE TABLE IF NOT EXISTS counter_epochs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  channel_id UUID NOT NULL,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ,
  reason VARCHAR(64) NOT NULL,
  unit VARCHAR(32) NOT NULL DEFAULT 'unknown',
  semantics VARCHAR(32) NOT NULL DEFAULT 'cumulative',
  config_version INTEGER NOT NULL DEFAULT 1,
  verified_by UUID REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS counter_epochs_dev_chan_idx ON counter_epochs(device_id, channel_id, start_at);

CREATE TABLE IF NOT EXISTS measurement_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  version INTEGER NOT NULL DEFAULT 1,
  energy_unit VARCHAR(32) NOT NULL DEFAULT 'unknown',
  semantics VARCHAR(32) NOT NULL DEFAULT 'cumulative',
  wrap_modulus NUMERIC(30, 12),
  sign_support VARCHAR(16) NOT NULL DEFAULT 'unsigned',
  calibration_evidence JSONB,
  verified_by UUID REFERENCES users(id),
  verified_at TIMESTAMPTZ,
  CONSTRAINT measurement_configs_dev_ver_unique UNIQUE(device_id, version)
);

CREATE TABLE IF NOT EXISTS tariff_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  currency VARCHAR(16) NOT NULL DEFAULT 'INR',
  effective_from TIMESTAMPTZ NOT NULL,
  to_at TIMESTAMPTZ,
  method VARCHAR(32) NOT NULL DEFAULT 'flat',
  rules_json JSONB NOT NULL,
  source_reference TEXT,
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS tariff_versions_site_from_idx ON tariff_versions(site_id, effective_from);

CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  timezone VARCHAR(64) NOT NULL,
  cutoff TIMESTAMPTZ NOT NULL,
  config_version INTEGER NOT NULL DEFAULT 1,
  tariff_version UUID REFERENCES tariff_versions(id),
  revision INTEGER NOT NULL DEFAULT 1,
  coverage JSONB NOT NULL,
  totals_json JSONB NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'preliminary',
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT reports_dev_period_rev_unique UNIQUE(device_id, period_start, revision)
);

CREATE INDEX IF NOT EXISTS reports_dev_period_idx ON reports(device_id, period_start);
