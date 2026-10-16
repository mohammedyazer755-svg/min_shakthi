# MIN-SAKTHI V2 progress
Updated: 16 October 2026. State: Phase 1 & Phase 2 COMPLETE; Phase 3 NOT STARTED.

## Phase state
| Phase | State | Gate evidence |
|---|---|---|
| 1 Foundation | PASS | `npm ci`, `npm run lint`, `npm run typecheck`, `npm run test:unit`, `npm run build` all passing cleanly. Design tokens, accessible primitives, contracts, schemas, security audit and command runner verified. |
| 2 MQTT ingestion | PASS | Pure parser and envelope flags (retained, dup) verified. MqttIngestService, DeviceRegistry, IngestCache, Freshness state machine, QuarantineManager, IngestMetrics, IngestTestSink, and safe publish-fixtures implemented. Integration suite (`npm run test:integration -- --suite=mqtt`) passed all gates: T01–T05, T12, T14. Ingest-to-cache p95 <= 50ms verified. Public telemetry remains closed. |
| 3 Persistence/auth/live slice | NOT STARTED | DB schema drafted in packages/db; Drizzle migrations, spool, auth, and socket tests pending Phase 3 |
| 4 Monitoring UI | NOT STARTED | Design system tokens and primitive showcase created; 10 operational screens pending Phase 4 |
| 5 History/reports/settings | NOT STARTED | Calculation/acceptance fixtures supplied; engine pending Phase 5 |
| 6 Deploy/hardware/handover | NOT STARTED | Docker compose test harness prepared; real broker, Render/Vercel deployment, and hardware tests pending Phase 6 |

## Phase 2 Exit Criteria Checklist
- [x] PASS: T01: Pure parser accepts all 3 formats (`topic-space-device`, `device-only`, `explicit-topic`), rejects malformed inputs explicitly
- [x] PASS: T02: Interleaved prototype1 and prototype2 with identical channel IDs maintain independent cache records without overwrite (R03 Device Isolation)
- [x] PASS: T03: Five display slots CH01–CH05 mapped per device; duplicate slot within device rejected; unconfigured slots return null (R04)
- [x] PASS: T04: Valid 0A/0W load remains fresh; transitions to stale at 5s and offline inferred at 30s under 1s interval; values preserved (R08)
- [x] PASS: T05: Broker connection state and SUBACK validation separated; upstream transport outage suppresses physical-offline inference (R01, R08)
- [x] PASS: T12: Preserves repeated receptions; marks suspect duplicate flag when MQTT dup is set (R02, R10)
- [x] PASS: T14: Retained packet marked `RETAINED_UNKNOWN_AGE`; freshness evaluated as stale, does not claim fresh hardware (R08)
- [x] PASS: Quarantines unregistered device IDs without crashing or auto-enrolling into organizations
- [x] PASS: Ingest-to-cache latency measured; p95 <= 50ms verified
- [x] PASS: Root contract command `npm run test:integration -- --suite=mqtt` implemented and passing
- [x] PASS: Strict safety in `scripts/publish-fixtures.ts`: refuses to publish to production broker `192.155.92.123`
- [x] PASS: Public telemetry endpoints remain closed; only sanitized `/health/live` and `/health/ready` exposed
- [-] BLOCKED: Real hardware verification (H01–H06) not performed; live ESP32 hardware and authorized production broker access belong to Phase 6
- [-] BLOCKED: External hosting and database provisioning (Render / Vercel custom domains) pending company infrastructure

## Tests actually performed in Phase 2
1. `npm run lint`: Zero errors, zero warnings across all workspaces.
2. `npm run typecheck`: Strict `tsc --noEmit` on all 5 workspaces (`contracts`, `protocol`, `db`, `server`, `web`).
3. `npm run test:unit`: 73 passing unit tests across 9 suites.
4. `npm run test:integration -- --suite=mqtt`: 9 passing integration tests (T01–T05, T12, T14, quarantine, and latency).
5. `npm run build`: Production build of all packages and applications succeeded.

## Exact files changed / created in Phase 2
- `packages/protocol/src/types.ts`: Added envelope flags (`retained`, `dup`, `qos`) to `ParserOptions`.
- `packages/protocol/src/parse.ts`: Incorporated `RETAINED_UNKNOWN_AGE` and `SUSPECT_DUPLICATE` quality flags.
- `packages/contracts/src/identity.ts`: Added `expectedIntervalMs` to `DeviceChannelMapping`.
- `apps/server/src/observability/metrics.ts`: Structured metrics, latency percentiles, bounded error diagnostics.
- `apps/server/src/ingest/registry.ts`: DeviceRegistry for test device enrollment and per-device mapping validation.
- `apps/server/src/ingest/cache.ts`: IngestCache keyed by composite identity `deviceId::channelId`.
- `apps/server/src/ingest/freshness.ts`: Freshness state machine with transport suppression and retained handling.
- `apps/server/src/ingest/quarantine.ts`: Capped quarantine manager for unknown devices and unmapped channels.
- `apps/server/src/ingest/sink.ts`: IngestTestSink for contract test observation and truthful snapshot generation.
- `apps/server/src/mqtt/client.ts`: MqttIngestService managing connection, SUBACK validation, and telemetry ingestion.
- `apps/server/src/index.ts`: Integrated MqttIngestService and honest readiness endpoint.
- `scripts/publish-fixtures.ts`: Isolated fixture publisher with production broker protection.
- `scripts/runner.js`: Implemented `test:integration` contract runner with `--suite` / `--scope` support.
- `tests/integration/mqtt.test.ts`: Integration test suite covering T01–T05, T12, T14, quarantine, and latency SLO.
- `tests/unit/security-audit.test.ts`: Updated future command list.
- `vitest.config.ts`: Added `tests/integration` to test include paths.
- `progress.md`: Phase 2 verification log and gate status.

## Remaining blockers and safe next action
- **Blockers:** Hardware owner confirmation for publish intervals, raw channel load assignments, and energy counter units/semantics (items Q01–Q04 in `docs/OPEN_QUESTIONS.md`).
- **Safe Next Action:** Open `prompts/PHASE_3.md` to begin Phase 3 (Database persistence, server-side authentication, durable spooling, and authenticated Socket.IO vertical slice). Do not start Phase 3 until user instruction.
