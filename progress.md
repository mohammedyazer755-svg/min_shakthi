# MIN-SAKTHI V2 progress
Updated: 16 October 2026. State: Phase 1 (Foundation, Architecture, Scaffolding, Design System) COMPLETE; Phase 2 NOT STARTED.

## Phase state
| Phase | State | Gate evidence |
|---|---|---|
| 1 Foundation | PASS | `npm ci`, `npm run lint`, `npm run typecheck`, `npm run test:unit`, `npm run build` all passing cleanly. Design tokens, accessible primitives, contracts, schemas, security audit and command runner verified. |
| 2 MQTT ingestion | NOT STARTED | Pure parser & fixture tests implemented in protocol package; service and isolated Mosquitto integration pending Phase 2 |
| 3 Persistence/auth/live slice | NOT STARTED | DB schema drafted in packages/db; Drizzle migrations, spool, auth, and socket tests pending Phase 3 |
| 4 Monitoring UI | NOT STARTED | Design system tokens and primitive showcase created; 10 operational screens pending Phase 4 |
| 5 History/reports/settings | NOT STARTED | Calculation/acceptance fixtures supplied; engine pending Phase 5 |
| 6 Deploy/hardware/handover | NOT STARTED | Docker compose test harness prepared; real broker, Render/Vercel deployment, and hardware tests pending Phase 6 |

## Phase 1 Exit Criteria Checklist
- [x] PASS: Workspace clean install on pinned Node 24 LTS (`v24.19.0`, npm `11.17.0`) via `npm ci`
- [x] PASS: Strict ESLint passing with zero warnings or errors (`npm run lint`)
- [x] PASS: Strict TypeScript typechecking across all 5 workspaces (`npm run typecheck`)
- [x] PASS: Full unit test suite passing (`npm run test:unit` - 8 test files, 64 tests)
- [x] PASS: Root command contract runner supporting `--suite` and `--scope` flags (e.g. `--suite=protocol`, `--scope=contracts`)
- [x] PASS: Future-tier commands (`test:integration`, `test:e2e`, `test:visual`, `test:load`, `test:security`, `test:hardware`, `db:migrate`, `db:seed:test`) fail loudly with exit code 1 and `NOT IMPLEMENTED` message
- [x] PASS: Production URL security validation strictly rejects localhost, 127.0.0.1, and plain HTTP in production builds (verified in Vite config and unit tests)
- [x] PASS: Built web client bundle inspected and verified free of broker IP (`192.155.92.123`), passwords, or secrets
- [x] PASS: Design system tokens (#F7F6F2 ivory, #FFFFFF surface, #202321 charcoal, #A38445 restrained gold, #176344 positive, #805300 warning, #A52E2E critical) verified for WCAG 2.2 AA contrast compliance
- [x] PASS: Component primitives (AppShell, Card, MetricCard, Button, Input, StatusSummary, FreshnessLabel, AlertBadge, DataTable, EmptyState, ErrorBanner) implemented with touch target >= 44px, focus rings, and screen-reader accessibility
- [x] PASS: Component showcase rendered with prominent `TEST ONLY` badges and no fabricated live telemetry or unauthenticated dashboards
- [x] PASS: Reconciled legacy audit (docs/LEGACY_AUDIT.md) preserved with zero credentials copied
- [x] PASS: Isolated test environment configured in `infra/compose.test.yml` (Mosquitto port 18883, PostgreSQL port 5433)
- [-] BLOCKED: Real hardware verification (H01–H06) not performed; live ESP32 hardware and authorized production broker access belong to Phase 6
- [-] BLOCKED: External hosting and database provisioning (Render / Vercel custom domains) pending company infrastructure

## Tests actually performed in Phase 1
1. `npm ci`: Clean install from committed `package-lock.json` on Node 24.19.0 (Exit code: 0).
2. `npm run lint`: ESLint across all packages and apps with zero errors and zero warnings (Exit code: 0).
3. `npm run typecheck`: Strict `tsc --noEmit` on `packages/contracts`, `packages/protocol`, `packages/db`, `apps/server`, and `apps/web` (Exit code: 0).
4. `npm run test:unit`: Vitest runner executing 64 unit tests across 8 suites:
   - `tests/unit/design-tokens.test.ts` (6 tests: token values, WCAG contrast ratios for text, buttons, status)
   - `packages/protocol/tests/parse.test.ts` (31 tests: all 30 parser cases from `parser_cases.json`, plus byte-for-byte execution of original 9 CSV rows from `original_mqtt.csv`)
   - `packages/contracts/tests/identity.test.ts` (5 tests: composite keys `deviceId::channelId`, device isolation, mapping uniqueness, display slots CH01–CH05)
   - `packages/contracts/tests/env.test.ts` (7 tests: production URL validation, rejection of HTTP/localhost/credentials)
   - `packages/contracts/tests/telemetry.test.ts` (5 tests: versioned schema, valid zero readings, negative scalar rejection)
   - `packages/contracts/tests/snapshot.test.ts` (2 tests: truthful snapshot, null lastSample for unseen/unconfigured)
   - `apps/server/src/config/env.test.ts` (3 tests: server environment loader, production requirements, secret sanitization)
   - `tests/unit/security-audit.test.ts` (5 tests: empty `.env.example`, no client secrets, non-zero future command exit, build failure on localhost URL, built bundle asset audit)
5. `npm run build`: Production build of all packages and applications (`dist/` generated for contracts, protocol, db, server, and web) (Exit code: 0).
6. `npm run build:server`: Targeted server build (Exit code: 0).
7. `npm run build:web`: Targeted web build with Vite (Exit code: 0).
8. `npm run test:unit -- --suite=protocol`: Verified root script filtering contract (Exit code: 0).
9. `npm run test:unit -- --scope=contracts`: Verified root script filtering contract (Exit code: 0).
10. Built asset audit: Automated verification confirming `apps/web/dist` contains no broker IP addresses, secret tokens, or pepper strings.

## Unperformed tests (Scheduled for subsequent phases)
- Integration tests (`test:integration`): Requires running Docker Mosquitto / PostgreSQL harness (Phase 2 & 3).
- End-to-end tests (`test:e2e`): Requires full authenticated live path (Phase 3 & 4).
- Visual regression tests (`test:visual`): Requires full 10-screen operations UI (Phase 4).
- Load & stress tests (`test:load`): Requires 50 packets/s pipeline and spool engine (Phase 3 & 6).
- Security penetration tests (`test:security`): Requires session cookies and site authorization middleware (Phase 3 & 6).
- Hardware verification (`test:hardware`): Requires physical ESP32 boards, known loads, and reference meters (Phase 6).

## Decisions to preserve
- Single always-on backend instance; shared authenticated socket; composite channel keys `deviceId::channelId`.
- Per-device mapping (CH01–CH05 slots mapped per device, not globally inferred).
- Truthful data representation: missing readings are `null` / `"—"`, valid zero remains zero; latest is not fresh; connectivity is not electrical health.
- UI palette: Warm Ivory `#F7F6F2`, white cards `#FFFFFF`, charcoal text `#202321`, restrained gold `#A38445`.
- Energy unit and semantics remain unverified; billing remains strictly disabled.
- No synthetic production history, waveform animations, PF/THD claims, or remote breaker control without verified hardware telemetry.

## Exact files changed / created in Phase 1
- `package.json`: Workspaces (`packages/*`, `apps/*`), Node 24 engine pinning, root command contract scripts.
- `package-lock.json`: Committed dependency lockfile.
- `.nvmrc`: Pinned Node `24.19.0`.
- `.gitignore`: Ignoring build outputs, node_modules, secrets, local spool, test artifacts.
- `.env.example`: Safe template containing only empty secret names.
- `tsconfig.base.json`: Strict TypeScript base configuration.
- `eslint.config.js`: Flat ESLint configuration with strict TypeScript checks.
- `vitest.config.ts`: Root test runner configuration with workspace aliases.
- `scripts/runner.js`: Cross-platform root command dispatcher supporting `--suite` and `--scope`, with non-zero future command stubs.
- `packages/contracts/`: Versioned telemetry, snapshot, error schemas, composite identity helpers, constraints, and unit tests.
- `packages/protocol/`: Pure legacy MQTT packet parser, error codes, and unit tests covering all fixture cases.
- `packages/db/`: Drizzle ORM schema stubs for users, sites, sessions, devices, channels, samples, and latest readings.
- `apps/server/`: Express service scaffolding, configuration validator, public health endpoints, and env unit tests.
- `apps/web/`: React + Vite + Tailwind application, design system tokens (`tokens.css`), 11 accessible UI primitives, labelled component showcase (`ComponentShowcase.tsx`), and SPA routing (`vercel.json`).
- `infra/compose.test.yml`: Isolated Docker test configuration for Mosquitto (port 18883) and PostgreSQL (port 5433).
- `infra/mosquitto.test.conf`: Test broker configuration.
- `infra/vercel.json`: Vercel SPA routing and security headers.
- `.github/workflows/ci.yml`: GitHub Actions CI pipeline executing Node 24 quality gates.
- `tests/unit/design-tokens.test.ts`: Automated WCAG 2.2 AA contrast test suite.
- `tests/unit/security-audit.test.ts`: Automated security audit and command contract test suite.
- `progress.md`: Phase 1 verification log and gate status.

## Remaining blockers and safe next action
- **Blockers:** Hardware owner confirmation for publish intervals, raw channel load mapping, and energy counter units (Q01–Q04 in `docs/OPEN_QUESTIONS.md`). These block live hardware claims and billing, not Phase 2 local implementation.
- **Safe Next Action:** Open `prompts/PHASE_2.md` to begin Phase 2 (Production MQTT ingestion and connection monitoring using the isolated Mosquitto test container and fixture publisher). Do not start Phase 2 until user instruction.
