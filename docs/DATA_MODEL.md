# Data model, retention and reporting
PostgreSQL; migrations committed and reviewed. UUID primary identities unless noted. Every owned record has site_id or a foreign-key path to it. All times timestamptz UTC; display/report timezone Asia/Kolkata by default. Decimal counters use NUMERIC(30,12), preserve original source token separately where needed. UUID/event cursor is not device-time evidence.

| Table | Required columns and constraints | Important indexes |
|---|---|---|
| users | id, normalized_email UNIQUE, password_hash, display_name, disabled_at, created_at | normalized_email |
| sites | id, name, timezone, retention_policy_version | id |
| memberships | user_id,site_id composite PK, role enum viewer/operator/admin | site_id,user_id |
| sessions | id,user_id,access_token_hash UNIQUE,refresh_family_id,refresh_hash,expires_at,refresh_expires_at,revoked_at | user_id, expires_at |
| invitations | id,site_id,email,role,token_hash,expires_at,used_at | token_hash UNIQUE |
| devices | id,site_id,source_namespace,raw_device_id,enabled,expected_interval_ms,config_version | UNIQUE(source_namespace,raw_device_id); site_id |
| device_channels | id,device_id,raw_channel_id,display_slot nullable 1..5,label,enabled,expected_interval_ms | UNIQUE(device_id,raw_channel_id); UNIQUE(device_id,display_slot) where not null |
| mapping_versions | id,device_id,version,effective_from,mapping_json,actor_id | UNIQUE(device_id,version) |
| telemetry_samples | event_id PK,site_id,device_id,channel_id FK,received_at,server_epoch,sequence NUMERIC(20,0),voltage,current,power,energy_raw NUMERIC(30,12),energy_token,frequency,qos,retained,suspect_duplicate,quality_json,config_version,device_time nullable | (device_id,channel_id,received_at,event_id); BRIN(received_at); UNIQUE(server_epoch,sequence) |
| latest_data | device_id,channel_id composite PK,event_id,received_at,values_json,quality_json | device_id |
| ingest_events | id,event_type,received_at,device_id nullable,reason,metadata_json | received_at; reason |
| gap_intervals | id,site_id,device_id nullable,from_at,to_at,reason,certainty | device_id,from_at |
| telemetry_rollups | device_id,channel_id,bucket_start,resolution,metric,count,min,max,sum,covered_seconds,quality_json | composite UNIQUE(device_id,channel_id,bucket_start,resolution,metric) |
| counter_epochs | id,device_id,channel_id,start_at,end_at,reason,unit,semantics,config_version,verified_by | device_id,channel_id,start_at |
| measurement_configs | id,device_id,version,energy_unit,semantics,wrap_modulus,sign_support,calibration_evidence,verified_by,verified_at | UNIQUE(device_id,version) |
| alert_rules | id,site_id,device_id,channel_id nullable,metric,operator,threshold,hysteresis,debounce_ms,severity,enabled,version | device_id,enabled |
| alerts | id,rule_id,device_id,channel_id,opened_at,resolved_at,last_seen_at,state,trigger_event_id | partial unique open rule/device/channel; site scope via device |
| alert_acknowledgements | id,alert_id,user_id,ack_at,note | UNIQUE(alert_id,user_id) |
| tariff_versions | id,site_id,currency,effective_from,to_at,method,rules_json,source_reference,approved_by,approved_at | site_id,effective_from; prevent overlapping validity |
| reports | id,site_id,device_id,period_start,end,timezone,cutoff,config_version,tariff_version,revision,coverage,totals_json,status,generated_at | device_id,period_start,revision |
| audit_log | id,site_id,actor_id,action,target,before_json,after_json,at,request_id | site_id,at |
| user_preferences | user_id PK,timezone,preferred_device_id,display_preferences | user_id |

Use composite foreign keys or transactional checks to ensure sample site/channel matches its device; never trust incoming siteId. Users do not directly connect to DB. API repositories require authorized site context for every query; integration tests must attempt cross-site access. Least-privilege application DB role; migrations use a separate role. Raw malformed input is capped, sanitized and restricted to admin diagnostics, not ordinary telemetry.

## Transactions and migrations
Atomic batch: insert immutable samples idempotently by eventId, conditionally upsert latest based on received_at and same-epoch sequence, commit; only then advance spool checkpoint. Crash between commit and checkpoint is safe because replay preserves eventId. Report and alert workers process durable events with their own recorded checkpoint; alert changes use an outbox/event record in the same transaction. DB outage may delay durable alerts: show “Alert evaluation delayed”, not all-clear. No double alert on replay.

Migrations: 0001 identities/auth, 0002 devices/config, 0003 readings/latest/spool-checkpoints, 0004 alerts/audit, 0005 rollups/reports/tariffs. Add indexes with operational care; test upgrades from previous schema and fresh DB. Prefer additive changes and expand/contract deployment. Do not make destructive rollback the default.

Start with ordinary tables at pilot volume. At production volume implied by 50/s, benchmark monthly partitioning before enabling 30-day retention. Partitioned-table event-ID uniqueness must be redesigned explicitly (e.g. separate idempotency ledger or partition-aware unique key); do not silently drop the global idempotency invariant. Document measured disk growth and query plans.

## Aggregation truth
Live power: sum only configured, fresh, acceptable-quality branch values; show “Partial · 2/5 reporting” if incomplete. Channels must represent independent loads before calling it a site total. Keep per-channel timestamp spread visible in diagnostics; asynchronous receipts are not a simultaneous meter sample. Voltage/frequency are shown per-channel or as labelled range; average only if explicitly labelled across reporting channels, never “grid supply” without wiring proof.

Trend aggregation keeps count/min/max and gaps. No browser-clock synthetic samples. Timestamp buckets use receipt time until firmware supplies verified source time. For irregular power samples, a time-weighted estimate may be computed only with a documented hold/interpolation bound and must be labelled estimated; it is not the verified counter-derived usage.

For verified cumulative energy, convert unit explicitly (Wh /1000 → kWh; kWh unchanged). Sum valid adjacent deltas within each counter epoch. Use decimal arithmetic; round only at display/final currency calculation. Day/month boundaries use site-local civil boundaries converted to UTC half-open intervals. Require valid boundary samples within confirmed interval tolerance. If absent, do not silently prorate: return known-interval usage and incomplete coverage. A counter difference spanning a gap can establish total between endpoints if no reset is possible, but cannot allocate that usage to individual hours/days; mark allocation uncertain. Counter decrease/reset, unknown sign or known loss excludes affected deltas until resolved.

Coverage exposes expected sample count (from configured interval), received count, time-covered fraction, boundary quality and excluded intervals; never equate sample count alone with billing completeness. Daily/monthly reports store raw-data cutoff and rule versions; late data creates a new revision, not an unexplained mutation. No tariff configured means no cost. A configured simple flat tariff produces an estimate until company validates units, counter behavior, calibration, topology and tariff applicability. Demand, fixed charges, taxes and time-of-day components must be explicitly included or labelled excluded. Do not claim a utility invoice total from energy-only multiplication.

## Retention and backup
Proposed raw 30d/minute 13mo/audit and reports 24mo, configurable after owner approval. Rollups complete and reconcile before raw deletion; unresolved forensic gaps may require retention holds. Retention jobs are idempotent and logged. Daily backups with encrypted provider storage, periodic isolated restore and row/report reconciliation. Target RPO/RTO in PRD are unverified until drill. Spool is not a database backup.
