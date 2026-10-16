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
