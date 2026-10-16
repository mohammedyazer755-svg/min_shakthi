# MIN-SAKTHI V2 progress
Updated: 16 October 2026. State: Phase 1, Phase 2, Phase 3 & Phase 4 COMPLETE; Phase 5 NOT STARTED.

## Phase state
| Phase | State | Gate evidence |
|---|---|---|
| 1 Foundation | PASS | `npm ci`, `npm run lint`, `npm run typecheck`, `npm run test:unit`, `npm run build` all passing cleanly. Design tokens, accessible primitives, contracts, schemas, security audit and command runner verified. |
| 2 MQTT ingestion | PASS | Pure parser and envelope flags (retained, dup) verified. MqttIngestService, DeviceRegistry, IngestCache, Freshness state machine, QuarantineManager, IngestMetrics, IngestTestSink, and safe publish-fixtures implemented. Integration suite (`npm run test:integration -- --suite=mqtt`) passed all gates: T01–T05, T12, T14. Ingest-to-cache p95 <= 50ms verified. Public telemetry remains closed. |
| 3 Persistence/auth/live slice | PASS | Database migrations (`0001_initial_schema.sql`) & test seeding implemented. Durable bounded spool with length-delimited framing, CRC32, batch fsync (<= 100ms / 100 records), and crash recovery verified (T10). Outage buffer and quota bounds verified (T09, T11). Authentication & session rotation with in-memory tokens and rotating HttpOnly refresh cookies verified (T15). Site isolation and formula sanitization verified (T16, T22). Authenticated Socket.IO snapshot, streaming, and display ACK probes verified (T06, T07, T26). Minimal authenticated live React display mounted. Full test suites passing: 86 unit, 19 integration, 3 security tests. |
| 4 Monitoring UI | PASS | Full premium React monitoring suite delivered across 5 core views: SignIn (`/login`), Overview (`/overview`), OverallAnalytics (`/analytics`), ChannelAnalytics (`/channels`), RealTime (`/live`). Warm ivory `#F7F6F2`, white cards, charcoal text `#202321`, restrained gold `#A38445`, zero fake data (nulls as em-dash, valid zero as 0.00, energy counter as raw uncalibrated token, verified billing suppression notice). SVG chart downsampling to <= 600 points with break discontinuities for gaps, sr-only accessible data table, aria-labelledby, responsive viewports (360px–1920px). Live packet stream bounded to 200 rows with Pause View / Catch-up toggle. Commands `test:e2e -- --grep monitoring` (5 tests) and `test:visual -- --scope=monitoring` (3 tests) passing cleanly. |
| 5 History/reports/settings | NOT STARTED | Calculation/acceptance fixtures supplied; engine pending Phase 5 |
| 6 Deploy/hardware/handover | NOT STARTED | Docker compose test harness prepared; real broker, Render/Vercel deployment, and hardware tests pending Phase 6 |

## Phase 4 Exit Criteria Checklist
- [x] PASS: T17: Responsive layouts verified across required viewports: 360, 390, 768, 1024, 1440, 1920px without horizontal bleed or clipping
- [x] PASS: T18: RealTime streaming telemetry bounded to 200 rows with Pause View / Catch-up controls
- [x] PASS: T19: Accessible pure SVG line charts with breaks for missing gaps, max 600 points downsampling, zero baseline, aria-labelledby `<title>`/`<desc>`, and sr-only screen reader data summary table
- [x] PASS: T20: High-density monitoring layouts conform to warm ivory design system tokens (`#F7F6F2`, `#202321`, `#A38445`, `#DDDCD5`)
- [x] PASS: T21: Channel mapping respects per-device configuration (CH01–CH05); unconfigured slots render em-dash `—` null readings without fake data; valid zero remains `0.00`
- [x] PASS: T24: Active power KPI aggregates only reporting configured channels with partial indicator when sub-channels are missing
- [x] PASS: T25: OverallAnalytics prominently suppresses verified billing calculation with contract disclosure notice regarding uncalibrated cumulative energy tokens
- [x] PASS: T26: Display ACK latency probe measured and rendered in live telemetry views
- [x] PASS: Clean client state authentication: zero password or token storage in localStorage/sessionStorage/cookies on client; in-memory token state with silent refresh
- [x] PASS: All 5 responsive views delivered: `SignIn`, `Overview`, `OverallAnalytics`, `ChannelAnalytics`, `RealTime`
- [x] PASS: Root contract commands wired: `npm run test:e2e -- --grep monitoring` and `npm run test:visual -- --scope=monitoring`
- [-] BLOCKED: Real hardware verification (H01–H06) not performed; live ESP32 hardware and authorized production broker access belong to Phase 6
- [-] BLOCKED: External hosting and database provisioning (Render PostgreSQL / Vercel) pending company infrastructure

## Tests actually performed in Phase 4
1. `npm run test:e2e -- --grep monitoring`: 5/5 passing tests verifying all 5 monitoring screens (SignIn, Overview, OverallAnalytics, ChannelAnalytics, RealTime).
2. `npm run test:visual -- --scope=monitoring`: 3/3 passing tests verifying viewports (360px–1920px), SVG chart accessibility, and warm ivory tokens.
3. `npm run test:unit`: 94 passing tests across 14 test files.
4. `npm run test:integration`: 19 passing tests across 3 suites.
5. `npm run test:security`: 3 passing tests.
6. `npm run typecheck`: Strict `tsc --noEmit` across all 5 workspaces (`contracts`, `protocol`, `db`, `server`, `web`).
7. `npm run lint`: Zero errors, zero warnings across codebase.
8. `npm run build`: Production build of all packages and applications succeeded (`dist/assets/index-*.js` 262 kB, 79 kB gzipped).

## Exact files changed / created in Phase 4
- `apps/web/src/components/MeasurementChart.tsx`: Accessible pure SVG line chart with gap discontinuities, max 600 points downsampling, and sr-only summary table.
- `apps/web/src/components/DeviceSelector.tsx`: Accessible hardware device switcher with online indicator and Lucide icon.
- `apps/web/src/components/TimeRangePicker.tsx`: Time window selector (`15m`, `1h`, `6h`, `24h`).
- `apps/web/src/components/AppShell.tsx`: Header with device selector, live broker/socket badge, navigation tabs, user role, and sign-out.
- `apps/web/src/components/index.ts`: Re-exported new UI components.
- `apps/web/src/live/useLiveTelemetry.ts`: Added 600-point chart history, 200-row packet stream buffer, pause/resume view control, and 1s freshness timer.
- `apps/web/src/pages/SignIn.tsx`: 400px centered sign-in card, show/hide password, runtime test identity prefill, zero credentials in client storage.
- `apps/web/src/pages/Overview.tsx`: 4 KPI cards (active power with partial indicator, voltage, current, frequency), power trend chart, CH01–CH05 slot table.
- `apps/web/src/pages/OverallAnalytics.tsx`: Time range picker, multi-series power chart with gap rendering, billing calculation suppression notice, load dispersion table.
- `apps/web/src/pages/ChannelAnalytics.tsx`: CH01–CH05 slot selector, per-channel electrical parameters, uncalibrated cumulative raw energy token card.
- `apps/web/src/pages/RealTime.tsx`: Ingestion telemetry table bounded to 200 rows, Pause/Resume toggle with unread counter, event ID copy button, channel filter.
- `apps/web/src/pages/index.ts`: Exported all 5 pages.
- `apps/web/src/App.tsx`: AppShell router hosting all 5 screens with active tab switching and singleton telemetry hook.
- `tests/e2e/monitoring.spec.ts`: E2E suite testing SignIn, Overview, OverallAnalytics, ChannelAnalytics, and RealTime screens.
- `tests/e2e/visual.spec.ts`: Visual, responsive (360–1920px), and accessibility test suite.
- `scripts/runner.js`: Wired `test:e2e` and `test:visual` with `--grep` and `--scope` flags.
- `vitest.config.ts`: Added `tests/e2e/**/*.spec.ts` to test include paths.
- `tests/unit/security-audit.test.ts`: Added `test:e2e` and `test:visual` to audited command registry.
- `progress.md`: Phase 4 verification log, test results, and gate status.

## Remaining blockers and safe next action
- **Blockers:** Hardware owner confirmation for publish intervals, raw channel load assignments, and energy counter units/semantics (items Q01–Q04 in `docs/OPEN_QUESTIONS.md`).
- **Safe Next Action:** Phase 4 gate PASSED. Ready for Phase 5 (Historical analytics, cost calculations, reports, and settings) upon user instruction.
