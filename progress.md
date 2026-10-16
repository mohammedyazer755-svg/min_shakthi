# MIN-SAKTHI V2 progress
Updated: 16 October 2026. State: Phase 1, Phase 2 & Phase 3 COMPLETE; Phase 4 NOT STARTED.

## Phase state
| Phase | State | Gate evidence |
|---|---|---|
| 1 Foundation | PASS | `npm ci`, `npm run lint`, `npm run typecheck`, `npm run test:unit`, `npm run build` all passing cleanly. Design tokens, accessible primitives, contracts, schemas, security audit and command runner verified. |
| 2 MQTT ingestion | PASS | Pure parser and envelope flags (retained, dup) verified. MqttIngestService, DeviceRegistry, IngestCache, Freshness state machine, QuarantineManager, IngestMetrics, IngestTestSink, and safe publish-fixtures implemented. Integration suite (`npm run test:integration -- --suite=mqtt`) passed all gates: T01–T05, T12, T14. Ingest-to-cache p95 <= 50ms verified. Public telemetry remains closed. |
| 3 Persistence/auth/live slice | PASS | Database migrations (`0001_initial_schema.sql`) & test seeding implemented. Durable bounded spool with length-delimited framing, CRC32, batch fsync (<= 100ms / 100 records), and crash recovery verified (T10). Outage buffer and quota bounds verified (T09, T11). Authentication & session rotation with in-memory tokens and rotating HttpOnly refresh cookies verified (T15). Site isolation and formula sanitization verified (T16, T22). Authenticated Socket.IO snapshot, streaming, and display ACK probes verified (T06, T07, T26). Minimal authenticated live React display mounted. Full test suites passing: 86 unit, 19 integration, 3 security tests. |
| 4 Monitoring UI | NOT STARTED | Operational screens and telemetry views pending Phase 4 |
| 5 History/reports/settings | NOT STARTED | Calculation/acceptance fixtures supplied; engine pending Phase 5 |
| 6 Deploy/hardware/handover | NOT STARTED | Docker compose test harness prepared; real broker, Render/Vercel deployment, and hardware tests pending Phase 6 |

## Phase 3 Exit Criteria Checklist
- [x] PASS: T08: Backend restart during spool replay preserves history, changes epoch, and prevents duplicate eventId insertion (R10)
- [x] PASS: T09: Handles database unavailability (100+ packets buffered in disk spool), tracks persistence lag, and commits uncommitted batch on DB restore without data loss (R10)
- [x] PASS: T10: Crash with truncated or corrupted final record is safely recovered and truncated to last valid offset without silent corruption (R10)
- [x] PASS: T11: Enforces spool quota bound and queue size cap, increments drop counters, and maintains bounded memory (R10)
- [x] PASS: T15: Login issues 5-minute access token in memory and rotating HttpOnly refresh cookie; reuse of old rotated token revokes session family; logout invalidates tokens (R05)
- [x] PASS: T16: Denies cross-site access on API endpoints and realtime socket subscriptions; prevents role escalation (R05)
- [x] PASS: T06: Authenticates Socket.IO connection with in-memory token, delivers atomic snapshot, and streams updates (R06, R07)
- [x] PASS: T07: Stale selection generations and out-of-order snapshots are discarded when switching devices rapidly (R07)
- [x] PASS: T22: CSV export escapes formula injection prefixes (`=`, `+`, `-`, `@`) with a single quote (R11)
- [x] PASS: T23: Database-down history query returns 503 with Retry-After guidance and zero fabricated rows (R11)
- [x] PASS: T27: Cold start with DB down reports readiness degraded without crashing (R05, R10)
- [x] PASS: T28: Compiled web assets verified clean of credentials, broker URLs, or passwords (R01, R05)
- [x] PASS: Double requestAnimationFrame browser paint proxy implemented for display ACK timing measurements (R18, T26)
- [x] PASS: Minimal authenticated vertical slice page (`IntegrationView.tsx`) displays mapped 5-slot channels with valid zeros and missing reading em-dashes
- [x] PASS: Commands `db:migrate`, `db:seed:test`, `test:security` wired to root contract runner
- [-] BLOCKED: Real hardware verification (H01–H06) not performed; live ESP32 hardware and authorized production broker access belong to Phase 6
- [-] BLOCKED: External hosting and database provisioning (Render PostgreSQL / Vercel) pending company infrastructure

## Tests actually performed in Phase 3
1. `npm run lint`: Zero errors, zero warnings across all workspaces.
2. `npm run typecheck`: Strict `tsc --noEmit` on all 5 workspaces (`contracts`, `protocol`, `db`, `server`, `web`).
3. `npm run test:unit`: 86 passing unit tests across 12 test files.
4. `npm run test:integration`: 19 passing integration tests across 3 suites (`mqtt.test.ts`, `persistence.test.ts`, `auth-socket.test.ts`).
5. `npm run test:security`: 3 passing security tests (`security.test.ts` for T16, T22, T28).
6. `npm run build`: Production build of all packages and applications succeeded (`contracts`, `protocol`, `db`, `server`, `web`).

## Exact files changed / created in Phase 3
- `packages/contracts/src/auth.ts`: Authentication, user role, and session contracts.
- `packages/contracts/src/socket.ts`: Socket handshake, device subscribe, display ACK, and typed events.
- `packages/contracts/src/index.ts`: Re-exported auth and socket schemas.
- `packages/db/src/schema.ts`: Added `spoolCheckpoints` table.
- `packages/db/migrations/0001_initial_schema.sql`: Initial PostgreSQL migration script.
- `packages/db/src/migrate.ts`: Database migration runner.
- `packages/db/src/seed.ts`: Test database seeder with scrypt password hashing and test profiles.
- `packages/db/src/index.ts`: Exported schema, seed, and migrate modules.
- `apps/server/src/storage/spool.ts`: Durable bounded length-delimited spool with CRC32 and crash truncation.
- `apps/server/src/storage/db.ts`: Telemetry repository interface and in-memory test implementation with site isolation.
- `apps/server/src/storage/persister.ts`: Telemetry persister worker batch committing spool records to DB with checkpointing.
- `apps/server/src/auth/service.ts`: AuthService managing password verification, session families, and token rotation.
- `apps/server/src/auth/middleware.ts`: Express middlewares `requireAuth`, `requireSiteRole`, `requireSiteAccess`.
- `apps/server/src/auth/routes.ts`: Routes for login, refresh, logout, and `/api/v1/me`.
- `apps/server/src/routes/telemetry.ts`: Latest, history, and CSV export routes with formula sanitization.
- `apps/server/src/realtime/socket.ts`: Socket.IO server with token handshake, atomic snapshots, and display ACK recording.
- `apps/server/src/observability/metrics.ts`: Added display ACK tracking and percentile latencies.
- `apps/server/src/mqtt/client.ts`: Attached spool, persister worker, and Socket.IO server.
- `apps/server/src/index.ts`: Integrated HTTP server, auth routes, telemetry routes, spool, and Socket.IO.
- `apps/web/src/vite-env.d.ts`: Vite environment type declarations.
- `apps/web/src/auth/AuthContext.tsx`: React AuthContext managing in-memory access tokens and silent refresh.
- `apps/web/src/live/useLiveTelemetry.ts`: Singleton Socket.IO telemetry hook with display ACK paint proxy.
- `apps/web/src/pages/IntegrationView.tsx`: Minimal authenticated live vertical slice page adhering to warm ivory design system.
- `apps/web/src/App.tsx`: Mounted AuthProvider and IntegrationView.
- `tests/integration/persistence.test.ts`: Integration test suite for T08, T09, T10, T11.
- `tests/integration/auth-socket.test.ts`: Integration test suite for T06, T07, T15, T16, T23, T27.
- `tests/security/security.test.ts`: Security test suite for T16, T22, T28.
- `tests/unit/security-audit.test.ts`: Updated future command list.
- `scripts/runner.js`: Wired `db:migrate`, `db:seed:test`, `test:security`.
- `vitest.config.ts`: Added `tests/security` to test includes.
- `progress.md`: Phase 3 verification log and gate status.

## Remaining blockers and safe next action
- **Blockers:** Hardware owner confirmation for publish intervals, raw channel load assignments, and energy counter units/semantics (items Q01–Q04 in `docs/OPEN_QUESTIONS.md`).
- **Safe Next Action:** Phase 3 gate PASSED. Ready for Phase 4 (Operations Interface and 10 monitoring screens) upon user instruction.
