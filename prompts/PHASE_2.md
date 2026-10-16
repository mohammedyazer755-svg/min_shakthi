# Phase 2 — Production MQTT ingestion and connection monitoring

You are implementing MIN-SAKTHI ENERGY INTELLIGENCE V2 in the repository open in this workspace. Work only on the phase stated below. Treat this as an implementation task, not a request for another plan.

Before edits, inspect repository instructions, git status and progress.md. Read docs/PRD.md, LEGACY_AUDIT.md, ARCHITECTURE.md, MQTT_PROTOCOL.md, DATA_MODEL.md, DESIGN_SYSTEM.md, TEST_PLAN.md, DEPLOYMENT_RUNBOOK.md and OPEN_QUESTIONS.md. If any required file is absent, locate the supplied planning pack and restore it; do not invent completed work. Confirm prior-phase exit evidence. Preserve user changes and working code. Do not reset an existing repository or overwrite credentials.

Non-negotiable contract: board → ESP32 → MQTT broker 192.155.92.123:1883 topic swiftpower → always-on Node/Express/MQTT.js on Render → validated parser/cache/persistence → authenticated Socket.IO → React/TypeScript/Vite on Vercel. No browser TCP MQTT or production localhost. Secrets only through secure runtime/provider configuration, never frontend, committed files, fixtures or chat. Use PostgreSQL, shared runtime schemas, npm workspaces and one socket manager per authenticated browser app session (one per tab; cross-tab multiplexing is not required). Site authorization applies to API/socket/export. Roles viewer/operator/admin are not granted by client state.

Accept these forms explicitly: `swiftpower prototype1,channel1,239.67,0.14,33.22,88.11,49.98`; `prototype1,channel1,239.67,0.14,33.22,88.11,49.98`; `swiftpower,prototype1,channel1,239.67,0.14,33.22,88.11,49.98`. Composite identity is deviceId+channelId. CH01–CH05 mappings are per device, not globally inferred. Missing readings are null, valid zero remains zero. Legacy packets have no source timestamps/sequences; do not claim exact publication ordering, deduplication or boot latency. No synthetic production history, waveform, PF, THD, breaker control or verified billing without data/evidence.

UI: warm ivory #F7F6F2, white cards, charcoal text, restrained gold, readable sans-serif type, compact information density, real charts with gaps. No oversized marketing text, decorative 3D or random live badges. Preserve the functioning data path before cosmetic changes. Production demo/test-packet endpoints are forbidden. Test publications use only the isolated local broker and TEST ONLY data.

Maintain progress.md throughout: initial state, exact files changed, decisions, commands/results, evidence, blockers, remaining work and next action. Implement required test scripts rather than claiming nonexistent commands passed. Run appropriate checks, fix errors and rerun affected checks. Missing credentials/hardware are BLOCKED, not PASS; complete all possible local work first. Do not advance a phase with failed mandatory gates. Never claim live hardware compatibility from fixture tests.

## Phase 2: Production MQTT ingestion and connection monitoring

**Objectives:** Prove exact packet handling, composite device identity and trustworthy ingest status before building cosmetic pages.

**Dependencies:** Phase 1 gate passed; isolated Mosquitto available. Real broker access is not needed to complete fixture tests.

**Tasks:**
1. Implement pure parser for topic-space-device seven fields, device-only seven fields and explicit-topic eight fields. Follow docs/MQTT_PROTOCOL.md byte limits, strict numeric grammar, semantic ranges, errors and retained semantics.
2. Implement long-running Node/Express server with environment-only MQTT configuration, bounded jitter reconnect, SUBACK validation, graceful shutdown, status heartbeat and structured redacted metrics.
3. Implement registered-device cache keyed by device/channel, per-device configurable mapping and quarantine for unknown IDs. Phase 2 uses test-only registry; production enrollment remains unavailable until Phase 3.
4. Implement event IDs, process epoch/cursor and freshness state machine independent of electrical load and transport health. Valid zero remains fresh; source measurement age stays unknown.
5. Use an internal contract test sink to verify updates immediately; no anonymous public telemetry/socket endpoint. Provide minimal /health/live and /health/ready without sensitive details.
6. Implement isolated fixture publisher and automated reconnect/parser/status tests. Persist no fake history. Database persistence arrives in Phase 3, so do not call Phase 2 restart-safe.

**Expected file changes:** packages/protocol/src/{parse,types,errors}.ts, packages/protocol/tests/*, apps/server/src/{mqtt,ingest,observability,config}/*, apps/server/src/index.ts, scripts/publish-fixtures.ts, tests/integration/mqtt.test.ts, tests/fixtures/*, progress.md

**Test commands:**
```sh
npm ci
npm run lint
npm run typecheck
npm run test:unit
docker compose -f infra/compose.test.yml up -d
npm run test:integration -- --suite=mqtt
npm run build
```
Commands with --suite/--scope are root-script contracts the implementing agent must support; they are not assumed native flags of a test framework. Root scripts may dispatch to the appropriate runner.

**Verification:** Replay all parser cases; interleave two devices with identical channel IDs; test valid zeros, retained packet, rejected SUBACK, broker outage and stale timer using fake clocks. Capture ingress → cache timing. No test publication to 192.155.92.123 or swiftpower production broker.

**Deliverables:** Tested MQTT service, parser, status model, isolated fixture tooling and initial ingest measurements.

**Mandatory exit criteria:** T01–T05,T12,T14 pass at their implemented ingest scope; both devices remain separate; every malformed case has a bounded diagnostic; reconnect restores subscription. Ingest timing evidence present. Public telemetry stays closed.

**Workload:** High correctness sensitivity; protocol ambiguities must remain explicit.

## Completion protocol
Work autonomously within this phase’s authorized repository changes. For external deployment use only configured accounts and the requested scope; do not touch unrelated production systems. Never solicit a password/token in conversation. If a provider requires approval, first finish the local reviewable work and explain the exact blocker.

Before ending, inspect the diff for accidental secrets, unrelated deletions and data placeholders. Update progress.md with a PASS/FAIL/BLOCKED checklist for every exit criterion, precise checks actually run and test evidence paths. Record unperformed tests explicitly. Return a concise report: implemented outcome, changed areas, commands/results, unresolved blockers and next phase readiness. Do not say “done” when only the UI works or when real hardware tests were simulated. Do not start the next phase in this turn.
