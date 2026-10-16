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
