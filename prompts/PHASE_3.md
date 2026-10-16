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
