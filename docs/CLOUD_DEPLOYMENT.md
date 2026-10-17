# Vercel cloud deployment

The Vercel project `min-shakthi` deploys directly from `mohammedyazer755-svg/min_shakthi`.

- Vite builds the existing frontend as static assets.
- The `api/cloud.js` function exports a bundled HTTP server for Express authentication, reports, configuration, and Socket.IO. Public API, health, and socket paths route to this function on the same origin as the frontend.
- The `mqtt` daemon maintains a continuous outbound subscription to the configured broker. It acknowledges QoS 1 deliveries after database commit. Its stable client ID and persistent MQTT session support broker redelivery when available. Malformed, unregistered, and unmapped packets remain rejected or quarantined.
- The Neon free-plan database stores sessions, telemetry, device mappings, preferences, alert rules/records, worker heartbeat, and audit entries. The API reads the worker's database heartbeat rather than claiming a broker connection from its own process.
- WebSockets and Daemons currently use Vercel's beta capabilities. Daemons run in production only. Preview environments have no production database credentials.

## Provisioning and verification

Configure provider environment variables through Vercel. Do not commit or print pulled environment files. `scripts/provision-cloud.mjs` applies additive migrations and creates the first admin only when securely supplied with `BOOTSTRAP_ADMIN_PASSWORD`. It does not load the test users or test password. Re-running it preserves existing passwords and mappings.

For local verification with ignored environment files:

```powershell
npm ci
npm run build
npm run lint
npm run test:unit
node --env-file=.env.production.local scripts/test-cloud.mjs
node --env-file=.env.production.local --env-file=.env.bootstrap.local scripts/verify-cloud.mjs
```

`test-cloud.mjs` creates and removes a unique isolated schema. It verifies cross-instance sessions, refresh replay protection, durable telemetry, tenant isolation, duplicate event IDs, optimistic mapping conflicts, preferences, and audit records. It never publishes MQTT fixtures.

`verify-cloud.mjs` starts the HTTP server locally unless `CLOUD_BASE_URL` points to a deployed origin. It verifies real login, refresh, logout, tenant denial, device diagnostics, database readiness, and Socket.IO snapshots. It logs no bearer tokens or passwords.

## ESP activity and fast status

The browser's connected socket and the worker's active MQTT subscription do not prove that an ESP is online. The shell derives ESP status and reporting coverage from recent non-retained, non-suspect-duplicate samples. Current-value cards expire locally every 250ms even when snapshots stop. A disconnected monitoring path yields interrupted/unknown status rather than a confirmed physical power failure.

Freshness uses the device's configured publish interval: a five-second publisher becomes stale at six seconds and inferred offline at ten seconds; a one-second publisher becomes stale at 1.5 seconds and inferred offline at five seconds. The API polls shared state every 500ms after each completed poll, and the worker records health every two seconds with a six-second observation lease. Network/database delays still apply; firmware cadence and physical on/off timing require measurement.

The legacy payload has no trusted device event timestamp or physical presence signal. True presence improvements require ESP heartbeat/session messages and an MQTT Last Will, with broker keep-alive timing validated on hardware. See the fast ESP-state requirement in `EXPERIENCE_REDESIGN_PLAN.md`. Test readings must stay isolated from production MQTT.

## Boundaries

Initial enrollment includes `prototype1` and `prototype2` with raw channels `channel1` through `channel5`, labeled generically. Confirm actual raw IDs and wiring before changing mappings. The device editor updates database configuration; the worker reloads it every five seconds. Unknown devices/channels do not enroll themselves from incoming packets.

Energy units remain unknown and billing remains suppressed. Receiving an ESP32 packet is not evidence of calibration.

Vercel daemon filesystems are ephemeral, so this cloud path does not use the local disk spool. Database outages or worker restarts may lose QoS 0 deliveries; QoS 1 recovery depends on broker persistence and publisher QoS. The original disk-spool server entrypoint remains available for a host with persistent storage. No physical hardware acceptance or durable-outage certification is claimed by software deployment checks.
