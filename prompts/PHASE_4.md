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
