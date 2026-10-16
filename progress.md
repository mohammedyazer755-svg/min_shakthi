# MIN-SAKTHI V2 progress
Updated: 16 October 2026. State: Phase 1, Phase 2, Phase 3, Phase 4 & Phase 5 COMPLETE; Phase 6 NOT STARTED.

## Phase state
| Phase | State | Gate evidence |
|---|---|---|
| 1 Foundation | PASS | `npm ci`, `npm run lint`, `npm run typecheck`, `npm run test:unit`, `npm run build` all passing cleanly. Design tokens, accessible primitives, contracts, schemas, security audit and command runner verified. |
| 2 MQTT ingestion | PASS | Pure parser and envelope flags (retained, dup) verified. MqttIngestService, DeviceRegistry, IngestCache, Freshness state machine, QuarantineManager, IngestMetrics, IngestTestSink, and safe publish-fixtures implemented. Integration suite (`npm run test:integration -- --suite=mqtt`) passed all gates: T01–T05, T12, T14. Ingest-to-cache p95 <= 50ms verified. Public telemetry remains closed. |
| 3 Persistence/auth/live slice | PASS | Database migrations (`0001_initial_schema.sql`) & test seeding implemented. Durable bounded spool with length-delimited framing, CRC32, batch fsync (<= 100ms / 100 records), and crash recovery verified (T10). Outage buffer and quota bounds verified (T09, T11). Authentication & session rotation with in-memory tokens and rotating HttpOnly refresh cookies verified (T15). Site isolation and formula sanitization verified (T16, T22). Authenticated Socket.IO snapshot, streaming, and display ACK probes verified (T06, T07, T26). Minimal authenticated live React display mounted. Full test suites passing. |
| 4 Monitoring UI | PASS | Full premium React monitoring suite delivered across 5 core views: SignIn (`/login`), Overview (`/overview`), OverallAnalytics (`/analytics`), ChannelAnalytics (`/channels`), RealTime (`/live`). Warm ivory `#F7F6F2`, white cards, charcoal text `#202321`, restrained gold `#A38445`, zero fake data (nulls as em-dash, valid zero as 0.00, energy counter as raw uncalibrated token, verified billing suppression notice). SVG chart downsampling to <= 600 points with break discontinuities for gaps, sr-only accessible data table, aria-labelledby, responsive viewports (360px–1920px). Live packet stream bounded to 200 rows with Pause View / Catch-up toggle. |
| 5 History/reports/settings | PASS | Full historical query engine with frozen cutoff and pagination; CSV export with spreadsheet formula injection escaping (`=`, `+`, `-`, `@`); civil-interval reports (Asia/Kolkata) with boundary quality, gap detection, verified counter delta summing, reset handling, and explicit uncalibrated billing suppression; durable alert rules engine with debounce, hysteresis, evaluation health pausing, and multi-user acknowledgements; device diagnostics and optimistic-locking channel mapping editor (409 Conflict); user preferences & audit trail; all 10 screens operational in React frontend. |
| 6 Deploy/hardware/handover | NOT STARTED | Docker compose test harness prepared; real broker, Render/Vercel deployment, and hardware tests pending Phase 6. |

## Phase 5 Exit Criteria Checklist
- [x] PASS: T17: Ten responsive screens operational (`SignIn`, `Overview`, `OverallAnalytics`, `ChannelAnalytics`, `RealTime`, `History`, `Reports`, `Alerts`, `Devices`, `Settings`) across all viewports (360px–1920px)
- [x] PASS: T18: Historical telemetry queries with pagination, time range filters, channel filters, and frozen query cutoff timestamp (`cutoffTimestamp`) to guarantee stable pagination under live ingestion
- [x] PASS: T19: History CSV export with RFC 4180 compliance, formula injection escaping (`=`, `+`, `-`, `@` prefixed with `'`), and strict site authorization
- [x] PASS: T20: Daily and monthly report engine implementing civil timezone half-open intervals (`Asia/Kolkata`), coverage fractions, boundary quality (`continuous`, `extrapolated`, `gap`), and gap tracking
- [x] PASS: T21: Report counter deltas calculated safely within epochs, monotonic reset handling, and explicit uncalibrated billing suppression notice (`isCostVerified: false`)
- [x] PASS: T22: Durable alert rules engine with debounce time (`debounceMs`), hysteresis threshold buffer, evaluation health pausing on stale data, and multi-user independent acknowledgements
- [x] PASS: T23: Device management and channel mapping editor (CH01–CH05) with optimistic concurrency control (`expectedConfigVersion`, 409 `OPTIMISTIC_LOCK_CONFLICT`) and admin authorization
- [x] PASS: T24: User preferences persistence (timezone, preferred device) and administrative audit trail logging
- [x] PASS: Zero broker IPs or backend network credentials exposed in frontend client bundles (verified by security audit scan)
- [x] PASS: Complete test matrix passing cleanly: `db:migrate`, `lint`, `typecheck`, `test:unit`, `test:integration`, `test:e2e`, `test:visual`, `test:security`, `build`
- [-] BLOCKED: Real hardware verification (H01–H06) not performed; live ESP32 hardware and authorized production broker access belong to Phase 6
- [-] BLOCKED: External hosting and database provisioning (Render PostgreSQL / Vercel) pending company infrastructure

## Tests actually performed in Phase 5
1. `npm run lint`: Zero warnings, zero errors across entire workspace.
2. `npm run typecheck`: Strict `tsc --noEmit` across all 5 workspace packages (`contracts`, `protocol`, `db`, `server`, `web`).
3. `npm run db:migrate`: Validated all 3 SQL migration scripts (`0001_initial_schema.sql`, `0004_alerts_and_audit.sql`, `0005_reports_and_tariffs.sql`).
4. `npm run test:unit`: 120/120 passing tests across 18 test files (including reports fixture validation against `report_cases.json`, alert debounce & hysteresis, and security audit).
5. `npm run test:integration`: 29/29 passing tests across 4 integration suites (including Phase 5 history pagination, 503 DB fallback, CSV formula escaping, cross-site denial, report generation, alert rules & ack, optimistic locking 409 conflict, user preferences & audit logs).
6. `npm run test:security`: 3/3 passing tests verifying site authorization isolation and access control.
7. `npm run test:e2e`: 14/14 passing tests verifying SSR and rendering for all 10 screens (`visual.spec.ts`, `monitoring.spec.ts`, `phase5-screens.spec.ts`).
8. `npm run test:visual`: 4/4 passing tests verifying all ten screens in DOM, responsive layout tokens, and accessibility labels.
9. `npm run build`: Production build succeeded across all packages (`dist/index.html` 0.74 kB, `dist/assets/index-*.js` 315.9 kB / 87.8 kB gzipped).
10. `tests/unit/security-audit.test.ts`: Passed all checks including strict rejection of localhost/HTTP in production bundle and zero broker IPs in client bundles.

## Exact files changed / created in Phase 5
- `packages/db/migrations/0004_alerts_and_audit.sql`: Schema migration for alert rules, alerts, acknowledgements, audit logs, and user preferences.
- `packages/db/migrations/0005_reports_and_tariffs.sql`: Schema migration for mapping versions, counter epochs, measurement configs, tariff versions, and reports.
- `packages/db/src/schema.ts`: Drizzle ORM table definitions for alerts, reports, mappings, epochs, tariffs, audit logs, and user preferences.
- `packages/db/src/migrate.ts`: Updated to validate migrations offline when `DATABASE_URL` is unset, and execute CLI correctly.
- `packages/contracts/src/reports.ts`: Schemas and types for daily/monthly report generation, boundary quality, and billing suppression.
- `packages/contracts/src/alerts.ts`: Schemas and types for alert rules, alerts, debounce, hysteresis, and multi-user acknowledgements.
- `packages/contracts/src/devices.ts`: Schemas and types for device diagnostics, channel mappings, and optimistic locking.
- `packages/contracts/src/preferences.ts`: Schemas and types for user preferences and administrative audit logs.
- `packages/contracts/src/index.ts`: Re-exported Phase 5 contracts.
- `apps/server/src/reports/engine.ts`: Core report engine implementing civil half-open intervals (`Asia/Kolkata`), coverage fraction, boundary quality, gap detection, counter deltas, reset handling, and billing suppression.
- `apps/server/src/alerts/engine.ts`: AlertEngine with debounce, hysteresis, evaluation health pausing on stale data, and multi-user acknowledgement tracking.
- `apps/server/src/storage/db.ts`: Enhanced `ITelemetryRepository` and `MemoryTelemetryRepository` with history querying, frozen cutoff, device mappings with optimistic locking, alert rules/records, user preferences, and audit logs.
- `apps/server/src/routes/telemetry.ts`: Paginated historical telemetry API, frozen cutoff timestamp, and formula-injection-safe CSV export (`=`, `+`, `-`, `@` escaped).
- `apps/server/src/routes/reports.ts`: REST endpoints for daily and monthly report generation with civil half-open bounds.
- `apps/server/src/routes/alerts.ts`: REST endpoints for listing alerts, independent acknowledgements, and admin rule management.
- `apps/server/src/routes/devices.ts`: REST endpoints for device diagnostics and channel mapping updates with optimistic concurrency check.
- `apps/server/src/routes/users.ts`: REST endpoints for user preferences and administrative audit logs.
- `apps/server/src/index.ts`: Mounted all Phase 5 routers into the Express application.
- `apps/web/src/pages/History.tsx`: Historical telemetry viewer with time/channel filters, pagination, frozen cutoff indicator, and formula-safe CSV export.
- `apps/web/src/pages/Reports.tsx`: Daily/monthly report view with coverage fraction, boundary quality, gap list, channel delta breakdown, and verified billing suppression notice.
- `apps/web/src/pages/Alerts.tsx`: Active/resolved alerts display with debounce/hysteresis metrics, evaluation health badge, and acknowledgement modal.
- `apps/web/src/pages/Devices.tsx`: Device diagnostics, broker transport status, CH01–CH05 mapping editor with optimistic locking, and admin role restrictions.
- `apps/web/src/pages/Settings.tsx`: User profile, preferences editor, alert rules management, and administrative audit log viewer.
- `apps/web/src/pages/index.ts`: Exported all ten screens.
- `apps/web/src/components/AppShell.tsx`: Navigation updated with all screens including `Devices`.
- `apps/web/src/App.tsx`: Wired client routing for all ten screens.
- `tests/unit/reports.test.ts`: Unit tests validating report generation against `report_cases.json`.
- `tests/unit/alerts.test.ts`: Unit tests verifying debounce, hysteresis, evaluation health pausing, and multi-user acknowledgements.
- `tests/integration/phase5.test.ts`: Integration test suite covering history pagination, DB unavailability guidance, CSV formula escaping, cross-site denial, report generation, alert rules & acks, optimistic locking (409 conflict), and user preferences/audit logs.
- `tests/e2e/phase5-screens.spec.ts`: E2E suite testing the 5 new Phase 5 screens.
- `tests/e2e/visual.spec.ts`: Visual and accessibility suite updated to test all ten screens.
- `scripts/runner.js`: Configured `test:e2e` runner to execute `tests/e2e` directory.
- `progress.md`: Phase 5 verification log, gate evidence, and test results.

## Remaining blockers and safe next action
- **Blockers:** Production broker connection credentials and real physical ESP32 hardware units for live telemetry integration (belong to Phase 6).
- **Safe Next Action:** Phase 5 gate PASSED. Ready for Phase 6 (Deploy, hardware verification, and handover) upon user instruction.
