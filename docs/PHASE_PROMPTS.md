# Six self-contained coding-agent prompts

Copy one complete prompt into Codex or Google Antigravity with this package in the repository. Separate copies are under prompts/. No prior chat memory is required. Run sequentially; do not skip failed exit gates.

---

# Phase 1 — Source audit, architecture, scaffolding and design system

You are implementing MIN-SAKTHI ENERGY INTELLIGENCE V2 in the repository open in this workspace. Work only on the phase stated below. Treat this as an implementation task, not a request for another plan.

Before edits, inspect repository instructions, git status and progress.md. Read docs/PRD.md, LEGACY_AUDIT.md, ARCHITECTURE.md, MQTT_PROTOCOL.md, DATA_MODEL.md, DESIGN_SYSTEM.md, TEST_PLAN.md, DEPLOYMENT_RUNBOOK.md and OPEN_QUESTIONS.md. If any required file is absent, locate the supplied planning pack and restore it; do not invent completed work. Confirm prior-phase exit evidence. Preserve user changes and working code. Do not reset an existing repository or overwrite credentials.

Non-negotiable contract: board → ESP32 → MQTT broker 192.155.92.123:1883 topic swiftpower → always-on Node/Express/MQTT.js on Render → validated parser/cache/persistence → authenticated Socket.IO → React/TypeScript/Vite on Vercel. No browser TCP MQTT or production localhost. Secrets only through secure runtime/provider configuration, never frontend, committed files, fixtures or chat. Use PostgreSQL, shared runtime schemas, npm workspaces and one socket manager per authenticated browser app session (one per tab; cross-tab multiplexing is not required). Site authorization applies to API/socket/export. Roles viewer/operator/admin are not granted by client state.

Accept these forms explicitly: `swiftpower prototype1,channel1,239.67,0.14,33.22,88.11,49.98`; `prototype1,channel1,239.67,0.14,33.22,88.11,49.98`; `swiftpower,prototype1,channel1,239.67,0.14,33.22,88.11,49.98`. Composite identity is deviceId+channelId. CH01–CH05 mappings are per device, not globally inferred. Missing readings are null, valid zero remains zero. Legacy packets have no source timestamps/sequences; do not claim exact publication ordering, deduplication or boot latency. No synthetic production history, waveform, PF, THD, breaker control or verified billing without data/evidence.

UI: warm ivory #F7F6F2, white cards, charcoal text, restrained gold, readable sans-serif type, compact information density, real charts with gaps. No oversized marketing text, decorative 3D or random live badges. Preserve the functioning data path before cosmetic changes. Production demo/test-packet endpoints are forbidden. Test publications use only the isolated local broker and TEST ONLY data.

Maintain progress.md throughout: initial state, exact files changed, decisions, commands/results, evidence, blockers, remaining work and next action. Implement required test scripts rather than claiming nonexistent commands passed. Run appropriate checks, fix errors and rerun affected checks. Missing credentials/hardware are BLOCKED, not PASS; complete all possible local work first. Do not advance a phase with failed mandatory gates. Never claim live hardware compatibility from fixture tests.

## Phase 1: Source audit, architecture, scaffolding and design system

**Objectives:** Create a reproducible foundation and approved data/UX contracts before feature work.

**Dependencies:** This documentation pack and the original source ZIP; no prior implementation assumed.

**Tasks:**
1. Inspect original source without copying embedded credentials. Reconcile docs/LEGACY_AUDIT.md with actual lines; retain evidence and distinguish source from deployed behavior.
2. Read all architecture documents; record unresolved hardware assumptions. Create npm workspaces apps/server, apps/web, packages/contracts, packages/protocol and packages/db with strict TypeScript, pinned Node 24 patch and lockfile.
3. Implement root command contract: dev, lint, typecheck, build, build:server, build:web, start:server, test:unit, test:integration, test:e2e, test:visual, test:load, test:security, test:hardware, db:migrate and db:seed:test. Future-tier commands must report NOT IMPLEMENTED and nonzero, never pass silently; only phase-required commands gate this phase.
4. Set environment schemas and production URL validation; .env.example contains only empty secret names. Configure gitignore, CI, formatting, SPA routing and isolated Docker test broker/database.
5. Create tokens and reusable accessible shell/form/card/status/table/empty-state primitives. Build a labelled component showcase using TEST ONLY data outside production routes. No fake authenticated dashboard or production live badge.
6. Define shared versioned telemetry/snapshot/error schemas and composite identity tests. Record provisional load/retention/energy constraints.

**Expected file changes:** package.json, package-lock.json, .nvmrc, .gitignore, .env.example, tsconfig.base.json, apps/web/src/styles/tokens.css, apps/web/src/components/*, apps/server/src/config/*, packages/contracts/src/*, packages/protocol/src/*, packages/db/*, infra/compose.test.yml, .github/workflows/ci.yml, docs/*, progress.md

**Test commands:**
```sh
npm ci
npm run lint
npm run typecheck
npm run test:unit
npm run build
```
Commands with --suite/--scope are root-script contracts the implementing agent must support; they are not assumed native flags of a test framework. Root scripts may dispatch to the appropriate runner.

**Verification:** Verify a clean install/build on the pinned runtime; invalid production backend URL fails; token/component contrast and keyboard states checked at 390 and 1440px. Confirm no broker secrets in web output.

**Deliverables:** Runnable workspace foundation, shared contract schemas, design primitives, CI and reconciled audit.

**Mandatory exit criteria:** Required commands pass from clean clone; environment errors are actionable; no client credentials or fake live data; all unresolved questions recorded. No application completeness or hardware claim.

**Workload:** Medium; foundation work and dependency compatibility are the main uncertainty.

## Completion protocol
Work autonomously within this phase’s authorized repository changes. For external deployment use only configured accounts and the requested scope; do not touch unrelated production systems. Never solicit a password/token in conversation. If a provider requires approval, first finish the local reviewable work and explain the exact blocker.

Before ending, inspect the diff for accidental secrets, unrelated deletions and data placeholders. Update progress.md with a PASS/FAIL/BLOCKED checklist for every exit criterion, precise checks actually run and test evidence paths. Record unperformed tests explicitly. Return a concise report: implemented outcome, changed areas, commands/results, unresolved blockers and next phase readiness. Do not say “done” when only the UI works or when real hardware tests were simulated. Do not start the next phase in this turn.


---

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


---

# Phase 3 — Database, authentication and authenticated live vertical slice

You are implementing MIN-SAKTHI ENERGY INTELLIGENCE V2 in the repository open in this workspace. Work only on the phase stated below. Treat this as an implementation task, not a request for another plan.

Before edits, inspect repository instructions, git status and progress.md. Read docs/PRD.md, LEGACY_AUDIT.md, ARCHITECTURE.md, MQTT_PROTOCOL.md, DATA_MODEL.md, DESIGN_SYSTEM.md, TEST_PLAN.md, DEPLOYMENT_RUNBOOK.md and OPEN_QUESTIONS.md. If any required file is absent, locate the supplied planning pack and restore it; do not invent completed work. Confirm prior-phase exit evidence. Preserve user changes and working code. Do not reset an existing repository or overwrite credentials.

Non-negotiable contract: board → ESP32 → MQTT broker 192.155.92.123:1883 topic swiftpower → always-on Node/Express/MQTT.js on Render → validated parser/cache/persistence → authenticated Socket.IO → React/TypeScript/Vite on Vercel. No browser TCP MQTT or production localhost. Secrets only through secure runtime/provider configuration, never frontend, committed files, fixtures or chat. Use PostgreSQL, shared runtime schemas, npm workspaces and one socket manager per authenticated browser app session (one per tab; cross-tab multiplexing is not required). Site authorization applies to API/socket/export. Roles viewer/operator/admin are not granted by client state.

Accept these forms explicitly: `swiftpower prototype1,channel1,239.67,0.14,33.22,88.11,49.98`; `prototype1,channel1,239.67,0.14,33.22,88.11,49.98`; `swiftpower,prototype1,channel1,239.67,0.14,33.22,88.11,49.98`. Composite identity is deviceId+channelId. CH01–CH05 mappings are per device, not globally inferred. Missing readings are null, valid zero remains zero. Legacy packets have no source timestamps/sequences; do not claim exact publication ordering, deduplication or boot latency. No synthetic production history, waveform, PF, THD, breaker control or verified billing without data/evidence.

UI: warm ivory #F7F6F2, white cards, charcoal text, restrained gold, readable sans-serif type, compact information density, real charts with gaps. No oversized marketing text, decorative 3D or random live badges. Preserve the functioning data path before cosmetic changes. Production demo/test-packet endpoints are forbidden. Test publications use only the isolated local broker and TEST ONLY data.

Maintain progress.md throughout: initial state, exact files changed, decisions, commands/results, evidence, blockers, remaining work and next action. Implement required test scripts rather than claiming nonexistent commands passed. Run appropriate checks, fix errors and rerun affected checks. Missing credentials/hardware are BLOCKED, not PASS; complete all possible local work first. Do not advance a phase with failed mandatory gates. Never claim live hardware compatibility from fixture tests.

## Phase 3: Database, authentication and authenticated live vertical slice

**Objectives:** Complete broker → parser → persistence → authenticated Socket.IO → minimal React measurement display before premium UI expansion.

**Dependencies:** Phase 2 gate passed; disposable PostgreSQL and test identities available. Persistent disk path can be local in integration tests.

**Tasks:**
1. Implement Drizzle migrations for users/memberships/sessions/devices/config, samples/latest, ingest gaps and checkpoints. Enforce ownership/unique mapping; provision accounts without legacy credentials.
2. Implement durable bounded spool, fsync/group commit, idempotent DB replay and precise pending/durable/committed status. Test crash points, DB outage, disk full, cold-start DB failure and graceful shutdown.
3. Implement server-side login, short-lived in-memory browser access token, rotating Secure HttpOnly refresh cookie and role/site authorization. Origin/CSRF/CORS/rate-limit protections and revocation apply to HTTP and sockets.
4. Implement versioned API and socket contracts, one client manager, atomic snapshot/delta ordering, selection generation, epoch-change handling, slow-client resync and overlap-deduped history refill.
5. Build a minimal real authenticated vertical-slice page showing raw mapped channel values, receipt time and independent status layers. It may be plain but must receive isolated MQTT packets through the actual backend and DB; no mock network store.
6. Add receipt/render timing probes, clock-offset uncertainty and display acknowledgements. Document cookie behavior for custom same-site domains versus default cross-site hosts. Never store bearer tokens in localStorage.

**Expected file changes:** packages/db/migrations/0001–0003*, packages/db/src/*, apps/server/src/{auth,api,realtime,storage,ingest}/*, apps/web/src/{auth,live}/*, apps/web/src/pages/IntegrationView.tsx, packages/contracts/src/*, tests/integration/*, tests/e2e/live-path.spec.ts, docs/evidence/*, progress.md

**Test commands:**
```sh
npm ci
docker compose -f infra/compose.test.yml up -d
npm run db:migrate
npm run db:seed:test
npm run lint
npm run typecheck
npm run test:unit
npm run test:integration
npm run test:e2e -- --grep live-path
npm run test:security
npm run build
```
Commands with --suite/--scope are root-script contracts the implementing agent must support; they are not assumed native flags of a test framework. Root scripts may dispatch to the appropriate runner.

**Verification:** Assert eventId across MQTT fixture/server/DB/browser, restart and replay, DB outage and queue/disk bounds, auth expiry/logout, cross-site access denial, delayed snapshot race and rapid device switch. Test refresh without waiting for new hardware message.

**Deliverables:** Secure persistent live pipeline, minimal browser proof, session lifecycle, stable schemas and recorded integration evidence.

**Mandatory exit criteria:** Core live vertical slice works before Phase 4; T06–T16,T23,T27–T28 pass at implemented scope; committed rows survive restart; no silent data loss or cross-site data exposure. Synthetic broker tests are labelled; real hardware remains unverified.

**Workload:** Highest backend complexity; spool correctness and auth/snapshot races are critical.

## Completion protocol
Work autonomously within this phase’s authorized repository changes. For external deployment use only configured accounts and the requested scope; do not touch unrelated production systems. Never solicit a password/token in conversation. If a provider requires approval, first finish the local reviewable work and explain the exact blocker.

Before ending, inspect the diff for accidental secrets, unrelated deletions and data placeholders. Update progress.md with a PASS/FAIL/BLOCKED checklist for every exit criterion, precise checks actually run and test evidence paths. Record unperformed tests explicitly. Return a concise report: implemented outcome, changed areas, commands/results, unresolved blockers and next phase readiness. Do not say “done” when only the UI works or when real hardware tests were simulated. Do not start the next phase in this turn.


---

# Phase 4 — Premium React monitoring experience

You are implementing MIN-SAKTHI ENERGY INTELLIGENCE V2 in the repository open in this workspace. Work only on the phase stated below. Treat this as an implementation task, not a request for another plan.

Before edits, inspect repository instructions, git status and progress.md. Read docs/PRD.md, LEGACY_AUDIT.md, ARCHITECTURE.md, MQTT_PROTOCOL.md, DATA_MODEL.md, DESIGN_SYSTEM.md, TEST_PLAN.md, DEPLOYMENT_RUNBOOK.md and OPEN_QUESTIONS.md. If any required file is absent, locate the supplied planning pack and restore it; do not invent completed work. Confirm prior-phase exit evidence. Preserve user changes and working code. Do not reset an existing repository or overwrite credentials.

Non-negotiable contract: board → ESP32 → MQTT broker 192.155.92.123:1883 topic swiftpower → always-on Node/Express/MQTT.js on Render → validated parser/cache/persistence → authenticated Socket.IO → React/TypeScript/Vite on Vercel. No browser TCP MQTT or production localhost. Secrets only through secure runtime/provider configuration, never frontend, committed files, fixtures or chat. Use PostgreSQL, shared runtime schemas, npm workspaces and one socket manager per authenticated browser app session (one per tab; cross-tab multiplexing is not required). Site authorization applies to API/socket/export. Roles viewer/operator/admin are not granted by client state.

Accept these forms explicitly: `swiftpower prototype1,channel1,239.67,0.14,33.22,88.11,49.98`; `prototype1,channel1,239.67,0.14,33.22,88.11,49.98`; `swiftpower,prototype1,channel1,239.67,0.14,33.22,88.11,49.98`. Composite identity is deviceId+channelId. CH01–CH05 mappings are per device, not globally inferred. Missing readings are null, valid zero remains zero. Legacy packets have no source timestamps/sequences; do not claim exact publication ordering, deduplication or boot latency. No synthetic production history, waveform, PF, THD, breaker control or verified billing without data/evidence.

UI: warm ivory #F7F6F2, white cards, charcoal text, restrained gold, readable sans-serif type, compact information density, real charts with gaps. No oversized marketing text, decorative 3D or random live badges. Preserve the functioning data path before cosmetic changes. Production demo/test-packet endpoints are forbidden. Test publications use only the isolated local broker and TEST ONLY data.

Maintain progress.md throughout: initial state, exact files changed, decisions, commands/results, evidence, blockers, remaining work and next action. Implement required test scripts rather than claiming nonexistent commands passed. Run appropriate checks, fix errors and rerun affected checks. Missing credentials/hardware are BLOCKED, not PASS; complete all possible local work first. Do not advance a phase with failed mandatory gates. Never claim live hardware compatibility from fixture tests.

## Phase 4: Premium React monitoring experience

**Objectives:** Deliver aligned responsive sign-in, overview, overall analytics, channel analytics and real-time monitoring using actual data contracts.

**Dependencies:** Phase 3 live vertical slice and authorization gates passed. Never replace the functioning store with mock arrays.

**Tasks:**
1. Implement compact ivory/white/charcoal/gold AppShell, device selector, drawer navigation and tokens from docs/DESIGN_SYSTEM.md. Remove oversized serif marketing, noise textures, unnecessary 3D and repeated status banners.
2. Implement secure sign-in UI, overview, overall analytics, individual channels and real-time data. Five slots use per-device mappings; missing data is null, zero is real, partial totals identify coverage.
3. Connect every value/status to the shared authenticated store or query cache. Lazy-load charts; cap 600 points/series and 200 live table rows. Batch chart paint ≤250ms without dropping ingestion events.
4. Render real receipt-time trends with breaks for gaps, min/max-preserving aggregation, units and provenance. No waveform/PF/THD, fabricated history, fake reports, test packet button or hardware controls.
5. Handle loading/empty/stale/broker-down/backend-unreachable/socket-down/DB-delayed states and rapid selection transitions. Timer updates may change age labels only, never manufacture chart samples.
6. Run visual/accessibility checks for implemented pages at all specified widths, zoom and DPR; capture TEST ONLY screenshots and fix alignment/contrast/performance issues. Run React component quality review.

**Expected file changes:** apps/web/src/pages/{SignIn,Overview,OverallAnalytics,ChannelAnalytics,RealTime}.tsx, apps/web/src/{app,components,styles,live}/*, tests/e2e/monitoring.spec.ts, tests/e2e/visual.spec.ts, docs/evidence/ui/*, progress.md

**Test commands:**
```sh
npm ci
npm run lint
npm run typecheck
npm run test:unit
npm run test:integration
npm run build
npm run test:e2e -- --grep monitoring
npm run test:visual -- --scope=monitoring
```
Commands with --suite/--scope are root-script contracts the implementing agent must support; they are not assumed native flags of a test framework. Root scripts may dispatch to the appropriate runner.

**Verification:** Screens at 360/390/768/1024/1440/1920px; keyboard and 200% zoom; route switching keeps one socket; actual isolated packet visible with eventId; warm latency smoke test and main-thread long-task inspection.

**Deliverables:** Five polished monitoring screens, shared accessible components and responsive verification evidence.

**Mandatory exit criteria:** No missing-data zeros or false green indicators; no page overflow, clipped units or duplicate connections; working pipeline preserved; visual and accessibility checks pass; chart shows actual packet timestamps.

**Workload:** High UI craft effort; correctness and readable density take priority over ornament.

## Completion protocol
Work autonomously within this phase’s authorized repository changes. For external deployment use only configured accounts and the requested scope; do not touch unrelated production systems. Never solicit a password/token in conversation. If a provider requires approval, first finish the local reviewable work and explain the exact blocker.

Before ending, inspect the diff for accidental secrets, unrelated deletions and data placeholders. Update progress.md with a PASS/FAIL/BLOCKED checklist for every exit criterion, precise checks actually run and test evidence paths. Record unperformed tests explicitly. Return a concise report: implemented outcome, changed areas, commands/results, unresolved blockers and next phase readiness. Do not say “done” when only the UI works or when real hardware tests were simulated. Do not start the next phase in this turn.


---

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


---

# Phase 6 — Deployment, hardware validation, performance and handover

You are implementing MIN-SAKTHI ENERGY INTELLIGENCE V2 in the repository open in this workspace. Work only on the phase stated below. Treat this as an implementation task, not a request for another plan.

Before edits, inspect repository instructions, git status and progress.md. Read docs/PRD.md, LEGACY_AUDIT.md, ARCHITECTURE.md, MQTT_PROTOCOL.md, DATA_MODEL.md, DESIGN_SYSTEM.md, TEST_PLAN.md, DEPLOYMENT_RUNBOOK.md and OPEN_QUESTIONS.md. If any required file is absent, locate the supplied planning pack and restore it; do not invent completed work. Confirm prior-phase exit evidence. Preserve user changes and working code. Do not reset an existing repository or overwrite credentials.

Non-negotiable contract: board → ESP32 → MQTT broker 192.155.92.123:1883 topic swiftpower → always-on Node/Express/MQTT.js on Render → validated parser/cache/persistence → authenticated Socket.IO → React/TypeScript/Vite on Vercel. No browser TCP MQTT or production localhost. Secrets only through secure runtime/provider configuration, never frontend, committed files, fixtures or chat. Use PostgreSQL, shared runtime schemas, npm workspaces and one socket manager per authenticated browser app session (one per tab; cross-tab multiplexing is not required). Site authorization applies to API/socket/export. Roles viewer/operator/admin are not granted by client state.

Accept these forms explicitly: `swiftpower prototype1,channel1,239.67,0.14,33.22,88.11,49.98`; `prototype1,channel1,239.67,0.14,33.22,88.11,49.98`; `swiftpower,prototype1,channel1,239.67,0.14,33.22,88.11,49.98`. Composite identity is deviceId+channelId. CH01–CH05 mappings are per device, not globally inferred. Missing readings are null, valid zero remains zero. Legacy packets have no source timestamps/sequences; do not claim exact publication ordering, deduplication or boot latency. No synthetic production history, waveform, PF, THD, breaker control or verified billing without data/evidence.

UI: warm ivory #F7F6F2, white cards, charcoal text, restrained gold, readable sans-serif type, compact information density, real charts with gaps. No oversized marketing text, decorative 3D or random live badges. Preserve the functioning data path before cosmetic changes. Production demo/test-packet endpoints are forbidden. Test publications use only the isolated local broker and TEST ONLY data.

Maintain progress.md throughout: initial state, exact files changed, decisions, commands/results, evidence, blockers, remaining work and next action. Implement required test scripts rather than claiming nonexistent commands passed. Run appropriate checks, fix errors and rerun affected checks. Missing credentials/hardware are BLOCKED, not PASS; complete all possible local work first. Do not advance a phase with failed mandatory gates. Never claim live hardware compatibility from fixture tests.

## Phase 6: Deployment, hardware validation, performance and handover

**Objectives:** Deploy the maintainable system, prove actual hardware operation and hand over truthful performance/security/operations evidence.

**Dependencies:** Phases 1–5 passed; company-controlled provider accounts, actual URLs and authorized hardware access securely configured. Missing access is a documented blocker, not a reason to fabricate results.

**Tasks:**
1. Recheck provider/runtime guidance; deploy PostgreSQL, single paid always-on disk-backed Render service and Vercel frontend following docs/DEPLOYMENT_RUNBOOK.md. Secrets go directly into provider environment managers; do not ask for them in chat.
2. Configure exact origins, HTTPS/WSS, same-site custom domains or explicit cross-site re-login limitation, DB backups, process and subscription monitoring. Validate fresh clone, migrations and deep-link routing.
3. Run H01–H06 with hardware owner: both boards, every configured channel, known load/reference meter, power cycles, multi-device phones/desktop, backend restart and authorized staging outages. Capture event IDs end to end; do not generate hardware pass from fixtures.
4. Run defined 50/s/20-client load target, clock uncertainty/paint proxy/ACK metrics, slow mobile and hidden-tab behavior. Report p50/p95/p99, missing samples and capacity; fix measured regressions.
5. Complete all ten-screen mobile/DPR/zoom/accessibility review, authorization tests, dependency/secret scans, retention sizing and isolated backup restore. Resolve critical/high defects; record accepted limitations.
6. Update all docs and progress.md with actual commands, URLs without credentials, versions, test results, restore RPO/RTO, operational ownership and billing eligibility. Produce source/release archive and handover checklist; preserve old deployment until acceptance.

**Expected file changes:** infra/{render.yaml,vercel.json}, .github/workflows/*, scripts/{load,hardware,verify-deploy}*, tests/hardware/*, docs/DEPLOYMENT_RUNBOOK.md, docs/evidence/*, docs/HANDOVER.md, docs/OPEN_QUESTIONS.md, progress.md

**Test commands:**
```sh
npm ci
npm run lint
npm run typecheck
npm run test:unit
npm run test:integration
npm run build
npm run test:e2e
npm run test:security
npm run test:visual
npm run test:load
npm run test:hardware
```
Commands with --suite/--scope are root-script contracts the implementing agent must support; they are not assumed native flags of a test framework. Root scripts may dispatch to the appropriate runner.

**Verification:** Run full matrix T01–T28 and H01–H06, backup restore drill and cross-device production smoke. Synthetic load and actual hardware evidence must be separate. If secrets/access absent, complete all local reviewable work and mark remaining deployment/hardware gates BLOCKED.

**Deliverables:** Deployed system when authorized/configured, full editable source, clean-clone runbook, test evidence, measured latency and final company handover.

**Mandatory exit criteria:** All release requirements traced; actual hardware evidence required for hardware-verified claim; p95≤1s normal warm workload established; no unresolved critical security/correctness defects. If any mandatory gate blocked, Phase 6 stays incomplete and report exact blocker. Billing remains disabled unless separately validated.

**Workload:** High verification and coordination effort; real hardware and account access determine final evidence availability.

## Completion protocol
Work autonomously within this phase’s authorized repository changes. For external deployment use only configured accounts and the requested scope; do not touch unrelated production systems. Never solicit a password/token in conversation. If a provider requires approval, first finish the local reviewable work and explain the exact blocker.

Before ending, inspect the diff for accidental secrets, unrelated deletions and data placeholders. Update progress.md with a PASS/FAIL/BLOCKED checklist for every exit criterion, precise checks actually run and test evidence paths. Record unperformed tests explicitly. Return a concise report: implemented outcome, changed areas, commands/results, unresolved blockers and next phase readiness. Do not say “done” when only the UI works or when real hardware tests were simulated. Do not start the next phase in this turn.
