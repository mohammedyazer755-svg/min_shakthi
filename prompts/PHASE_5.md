# Phase 5 — History, real reports, alerts, settings and exports

You are implementing MIN-SAKTHI ENERGY INTELLIGENCE V2 in the repository open in this workspace. Work only on the phase stated below. Treat this as an implementation task, not a request for another plan.

Before edits, inspect repository instructions, git status and progress.md. Read docs/PRD.md, LEGACY_AUDIT.md, ARCHITECTURE.md, MQTT_PROTOCOL.md, DATA_MODEL.md, DESIGN_SYSTEM.md, TEST_PLAN.md, DEPLOYMENT_RUNBOOK.md and OPEN_QUESTIONS.md. If any required file is absent, locate the supplied planning pack and restore it; do not invent completed work. Confirm prior-phase exit evidence. Preserve user changes and working code. Do not reset an existing repository or overwrite credentials.

Non-negotiable contract: board → ESP32 → MQTT broker 192.155.92.123:1883 topic swiftpower → always-on Node/Express/MQTT.js on Render → validated parser/cache/persistence → authenticated Socket.IO → React/TypeScript/Vite on Vercel. No browser TCP MQTT or production localhost. Secrets only through secure runtime/provider configuration, never frontend, committed files, fixtures or chat. Use PostgreSQL, shared runtime schemas, npm workspaces and one socket manager per authenticated browser app session (one per tab; cross-tab multiplexing is not required). Site authorization applies to API/socket/export. Roles viewer/operator/admin are not granted by client state.

Accept these forms explicitly: `swiftpower prototype1,channel1,239.67,0.14,33.22,88.11,49.98`; `prototype1,channel1,239.67,0.14,33.22,88.11,49.98`; `swiftpower,prototype1,channel1,239.67,0.14,33.22,88.11,49.98`. Composite identity is deviceId+channelId. CH01–CH05 mappings are per device, not globally inferred. Missing readings are null, valid zero remains zero. Legacy packets have no source timestamps/sequences; do not claim exact publication ordering, deduplication or boot latency. No synthetic production history, waveform, PF, THD, breaker control or verified billing without data/evidence.

UI: warm ivory #F7F6F2, white cards, charcoal text, restrained gold, readable sans-serif type, compact information density, real charts with gaps. No oversized marketing text, decorative 3D or random live badges. Preserve the functioning data path before cosmetic changes. Production demo/test-packet endpoints are forbidden. Test publications use only the isolated local broker and TEST ONLY data.

Maintain progress.md throughout: initial state, exact files changed, decisions, commands/results, evidence, blockers, remaining work and next action. Implement required test scripts rather than claiming nonexistent commands passed. Run appropriate checks, fix errors and rerun affected checks. Missing credentials/hardware are BLOCKED, not PASS; complete all possible local work first. Do not advance a phase with failed mandatory gates. Never claim live hardware compatibility from fixture tests.

## Phase 5: History, real reports, alerts, settings and exports

**Objectives:** Complete all ten screens and historical workflows with defensible calculations and durable configuration.

**Dependencies:** Phase 4 gates passed; persisted telemetry and site authorization working. Billing inputs may remain unknown without blocking nonbilling features.

**Tasks:**
1. Implement history filters/pagination/downsample APIs, real CSV export with formula-injection protection, timezone handling and frozen query cutoff. DB failure must not return fake empty success.
2. Implement daily/monthly reports, coverage/gap calculation, counter epochs/resets/wrap policy, decimal conversion and versioned report revisions. Do not invent boundary readings or allocate unknown gap usage.
3. Implement billing eligibility validation: units/semantics/direction/calibration/topology/tariff approval. Default disabled. Incremental energy without event identity cannot be verified. Use test-only tariff fixtures, no copied screenshot tariff.
4. Implement durable alert rules with debounce/hysteresis, independent acknowledgement/resolution, idempotent replay, evaluation-health state and administrative configuration audit.
5. Implement device diagnostics, mapping/settings editor with optimistic locking, account/profile/preferences and role restrictions. Mapping edits invalidate caches but preserve historical raw identities.
6. Finish History, Reports, Alerts, Devices/Diagnostics and Profile/Settings UI; verify cross-user consistency, export/report parity and all state/empty scenarios.

**Expected file changes:** packages/db/migrations/0004–0005*, apps/server/src/{reports,alerts,api}/*, apps/web/src/pages/{History,Reports,Alerts,Devices,Settings}.tsx, tests/fixtures/report_cases.json, tests/{integration,e2e}/*, docs/evidence/*, progress.md

**Test commands:**
```sh
npm ci
npm run db:migrate
npm run lint
npm run typecheck
npm run test:unit
npm run test:integration
npm run test:e2e
npm run test:security
npm run test:visual
npm run build
```
Commands with --suite/--scope are root-script contracts the implementing agent must support; they are not assumed native flags of a test framework. Root scripts may dispatch to the appropriate runner.

**Verification:** Run T17–T24 including day/month boundaries, resets, unknown units, incremental ambiguity, formula injection and multi-user acknowledgements. Compare exported data to DB and report math exactly. Verify every screen responsive.

**Deliverables:** Complete ten-screen application, durable alerts/settings, real history/CSV and gated reports/billing.

**Mandatory exit criteria:** Reports/exports reconcile to source; no verified billing with missing evidence; durable alerts and server settings survive restart; all ten screens pass implemented functional/visual tests. Billing-disabled state is acceptable, falsely verified billing is not.

**Workload:** High analytical correctness effort; tariff and calibration evidence may remain external blockers.

## Completion protocol
Work autonomously within this phase’s authorized repository changes. For external deployment use only configured accounts and the requested scope; do not touch unrelated production systems. Never solicit a password/token in conversation. If a provider requires approval, first finish the local reviewable work and explain the exact blocker.

Before ending, inspect the diff for accidental secrets, unrelated deletions and data placeholders. Update progress.md with a PASS/FAIL/BLOCKED checklist for every exit criterion, precise checks actually run and test evidence paths. Record unperformed tests explicitly. Return a concise report: implemented outcome, changed areas, commands/results, unresolved blockers and next phase readiness. Do not say “done” when only the UI works or when real hardware tests were simulated. Do not start the next phase in this turn.
