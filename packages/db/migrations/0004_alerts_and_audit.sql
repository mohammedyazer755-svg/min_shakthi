-- Migration 0004: Alerts, Audit Log and User Preferences
CREATE TABLE IF NOT EXISTS alert_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  channel_id UUID REFERENCES device_channels(id) ON DELETE CASCADE,
  metric VARCHAR(32) NOT NULL, -- 'voltage' | 'current' | 'power' | 'frequency'
  operator VARCHAR(16) NOT NULL, -- 'gt' | 'lt' | 'gte' | 'lte'
  threshold NUMERIC(14, 4) NOT NULL,
  hysteresis NUMERIC(14, 4) NOT NULL DEFAULT 0,
  debounce_ms INTEGER NOT NULL DEFAULT 0,
  severity VARCHAR(16) NOT NULL DEFAULT 'warning', -- 'critical' | 'warning' | 'info'
  enabled BOOLEAN NOT NULL DEFAULT true,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS alert_rules_dev_enabled_idx ON alert_rules(device_id, enabled);
CREATE INDEX IF NOT EXISTS alert_rules_site_idx ON alert_rules(site_id);

CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID NOT NULL REFERENCES alert_rules(id) ON DELETE CASCADE,
  device_id UUID NOT NULL,
  channel_id UUID,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  state VARCHAR(32) NOT NULL DEFAULT 'open', -- 'open' | 'acknowledged' | 'resolved'
  trigger_event_id UUID,
  trigger_value NUMERIC(14, 4) NOT NULL,
  violation_start_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS alerts_rule_dev_state_idx ON alerts(rule_id, device_id, state);
CREATE INDEX IF NOT EXISTS alerts_opened_idx ON alerts(opened_at);

CREATE TABLE IF NOT EXISTS alert_acknowledgements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id UUID NOT NULL REFERENCES alerts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ack_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  note TEXT,
  CONSTRAINT alert_ack_unique UNIQUE(alert_id, user_id)
);

CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  actor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action VARCHAR(64) NOT NULL,
  target VARCHAR(128) NOT NULL,
  before_json JSONB,
  after_json JSONB,
  at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  request_id VARCHAR(64)
);

CREATE INDEX IF NOT EXISTS audit_log_site_at_idx ON audit_log(site_id, at);

CREATE TABLE IF NOT EXISTS user_preferences (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  timezone VARCHAR(64) NOT NULL DEFAULT 'Asia/Kolkata',
  preferred_device_id UUID,
  display_preferences JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
