# Product requirements
Status: proposed build contract; implementation and hardware verification pending.

## Purpose and users
MIN-SAKTHI turns measurements from an existing board and ESP32 into trustworthy operating information. An operator needs to identify which branch is drawing power and whether data is fresh. A supervisor needs defensible historical usage and reports. An administrator needs device mappings, account control and diagnostics. Company maintainers need editable source, reproducible builds, migration history and deployment ownership.

The central failure to eliminate is a convincing interface that does not reflect physical measurements. The product is monitoring software, not a protective relay, revenue-grade meter or remote breaker controller.

## Scope and priority
All ten requested screens are release scope. The functional MVP is authenticated MQTT-to-browser delivery, multi-device isolation, persistent samples, truthful states, overview and channel monitoring. History, reports, alerts and settings follow this working path. Later scope: SSO, validated power-quality hardware, high availability and large fleets. No waveform, THD, PF, phase-angle, breaker control, automatic tariff claims, predictive AI or synthetic live fallback in V2.

| ID | Requirement | Acceptance / test | Phase |
|---|---|---|---|
| R01 | Preserve board → ESP32 → broker → always-on Node → parser → Socket.IO → React | Isolated-broker pipeline test, then H01 hardware evidence | 2–3,6 |
| R02 | Accept three exact packet formats; reject malformed inputs explicitly | All parser fixture expectations pass, no NaN/Infinity/empty coercion | 2 |
| R03 | Isolate devices and use per-device physical-channel mappings | prototype1/channel1 cannot overwrite prototype2/channel1; mapping uniqueness enforced | 2–4 |
| R04 | Five display slots CH01–CH05 | Unconfigured slots show “Not configured”, not zero/online; confirmed channels map once | 4 |
| R05 | Server-side authentication and site-scoped authorization | Anonymous, expired and cross-site API/socket requests denied | 3 |
| R06 | One socket manager per authenticated browser app session | Route navigation and React StrictMode do not multiply active connections | 3–4 |
| R07 | Immediate consistent snapshot and reconnect resync | No older snapshot overwrites a newer event; refresh works without next hardware packet | 3 |
| R08 | Independent transport and measurement freshness | Broker, backend, socket, DB and per-channel states visible; valid zero remains fresh | 2–4 |
| R09 | Real time-stamped charts with gaps | No timer-generated readings; source timestamp and data coverage available | 4 |
| R10 | Durable historical samples and honest outage behavior | Backend restart retains committed samples; bounded spool replays once | 3 |
| R11 | History and CSV export | Filtered export equals source rows; timezone and units explicit; authorization enforced | 5 |
| R12 | Daily/monthly reports | Verified counter deltas, coverage, reset exclusions and configuration version included | 5 |
| R13 | Billing validation gate | Unknown units/reset/tariff/calibration disables verified cost; no guessed tariff | 5–6 |
| R14 | Durable alerts and acknowledgements | Debounce/hysteresis tested; acknowledgement not resolution; restart retains state | 5 |
| R15 | Device diagnostics and settings | Admin-only mapping/threshold changes, version conflicts and audit log | 5 |
| R16 | User profile/settings | Server-persisted preferences; logout revokes session and clears live cache | 3–5 |
| R17 | Premium responsive interface | Ten screens checked at 360,390,768,1024,1440,1920 px; keyboard and 200% zoom | 4–6 |
| R18 | Measured latency | Warm server-receipt → visible-update p95 ≤1,000 ms in defined workload | 3,6 |
| R19 | Reproducible handover | Fresh-clone build, deployment, restore and troubleshooting performed by maintainer | 6 |

## Roles
Viewer: assigned-site live/history/reports/export and own profile. Operator: viewer plus alert acknowledgement. Admin: operator plus assigned-site device mappings, thresholds, user grants and billing configuration. All roles are scoped to a site. No self-registration granting site access; admin invitation/bootstrap creates membership. Changing own profile cannot elevate role. Internal raw packet access is admin-only.

## Data integrity rules
Missing is null/“—”; zero is a valid measurement. Latest does not mean fresh. Connectivity does not mean electrical health. Only fresh configured channels contribute to the current subtotal; explicitly show reporting count and partial status. Until wiring is confirmed independent, call the aggregate “Sum of reporting channels”, not whole-building consumption. Do not sum currents or imply an average voltage represents a supply phase. Energy counters have unknown units until verified; do not sum raw lifetime counters as daily usage.

## Service objectives and provisional capacity
Planning load: 10 devices × 5 channels × 1 message/second = 50 packets/second, 20 authenticated foreground clients. This is a test envelope, not a measured capacity claim. Normal warm network: RTT ≤150 ms, no intentional loss, foreground browser, backend/broker connected, DB healthy. Targets: receipt-to-display p95 ≤1s; p99 ≤2s; authenticated snapshot p95 ≤1s; first accepted hardware packet visible ≤2s. Ingest-to-cache p95 ≤50ms. Load test 15 minutes after 2-minute warmup, report p50/p95/p99, sample count and excluded conditions. Slow-network tests measure degradation separately; never exclude failures from normal-run results silently.

Initial stale threshold S=max(3×configured per-channel interval,5s); offline-inferred O=max(10×interval,30s). Until interval confirmed use provisional 5s interval (S=15s,O=50s), visibly marked in diagnostics. State transition resolution ≤1s. Physical-offline inference is suppressed when upstream transport is unavailable.

## Security, privacy and reliability
No secrets in client bundles, commits, prompts, logs or fixtures. HTTPS/WSS for browser links; MQTT 1883 remains plaintext unless a separately validated broker change occurs. Go-live records this transport risk and company disposition. Keep telemetry site-isolated. Rate-limit login, exports and subscriptions. Escape spreadsheet formula cells in exports. Audit privileged changes. Log structured diagnostics without passwords, cookies or tokens.

Provisional retention: raw readings 30 days, minute rollups 13 months, report/audit records 24 months; obtain company approval and capacity estimate before production. At 50/s, 30 days is 129.6 million rows: measure actual row/index bytes and provision accordingly or revise retention before launch. Restricted malformed-payload samples retained 7 days with count/size caps. Backup target RPO ≤24h, restore target RTO ≤4h, pending restore drill; live ingest is not guaranteed during broker/backend outages.

## Release definition
Every R01–R19 has passing evidence or a documented scope exclusion accepted by the owner. Unknown energy units may allow monitoring release with billing disabled. Missing real hardware validation prohibits “hardware verified” release claims. Hardware tests require both boards and every configured channel. Accessibility: WCAG 2.2 AA target, readable non-color status, focus visibility, semantic tables, reduced motion. No production test-packet button.
