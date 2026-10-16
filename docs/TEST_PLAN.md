# Test plan and acceptance evidence
Status: specification only. Fixtures are not live hardware evidence. All commands below are scripts to implement during the named phase; no claim they currently exist in this documentation-only package.

## Test command contract
Root npm workspaces must expose lint, typecheck, build, test:unit, test:integration, test:e2e, test:load, test:security, test:visual, test:hardware, db:migrate and db:seed:test. Unit: Vitest. API/socket: Vitest + Supertest + real Socket.IO client. Integration: disposable PostgreSQL and Mosquitto from infra/compose.test.yml. Browser: Playwright with axe checks. Isolated fixture publisher defaults to localhost broker and refuses the production host/topic unless a separate explicitly authorized hardware operation is used. TEST_ONLY marker and separate DB required. Do not install an e2e authentication bypass into production.

## Automated matrix
| ID | Setup and fault | Expected outcome | Tier / requirement |
|---|---|---|---|
| T01 | Run original nine CSV cases and expanded parser_cases.json | Exact IDs/values and errors match; source timestamp null; raw energy string preserved | unit / R02 |
| T02 | prototype1/channel1=33.22W; prototype2/channel1=900W, interleaved | Two independent latest rows, sockets and history; no overwrite | integration/e2e / R03 |
| T03 | Map prototype1/channel1→CH01; prototype2/channel0→CH01 in TEST DB | Display independent; duplicate slot within one device rejected; unconfigured slots null | unit/integration / R04 |
| T04 | Valid 0A/0W then stop packets, interval=1s | Fresh zero; stale after 5s, inferred offline after 30s ±1s; values preserved | fake-clock+e2e / R08 |
| T05 | Disconnect broker, reconnect and refuse then grant SUBACK | Separate broker/subscription state; hardware unknown; bounded retry; resume without reload | integration / R01,R08 |
| T06 | Close socket while HTTP stays reachable; restore | Live-stream disconnected; exactly one client manager; snapshot resync | integration/e2e / R06,R07 |
| T07 | Delay HTTP/snapshot and switch devices rapidly while updates arrive | No old snapshot overwrites new update or wrong-device view; generation/cursor verified | integration/e2e / R07 |
| T08 | Restart backend after commit and during spool replay | Persisted history unchanged, epoch changes; no duplicate eventId; latest not rolled back | integration / R10 |
| T09 | DB unavailable 120s at 50 packets/s, disk healthy | 6,000 accepted events spool, warm authorized client remains only within session policy; replay DB rows once; durability lag visible | integration / R10 |
| T10 | Crash between append/fsync/DB commit/checkpoint separately; inject truncated final spool record | Recovery follows documented boundaries; no silent corruption; pre-fsync possible loss recorded | integration / R10 |
| T11 | Spool quota exceeded / write denied / queue saturated | Bounded RAM, explicit non-durable/drop counters, incomplete reports, no healthy-storage badge | integration / R10 |
| T12 | Identical legitimate packets then MQTT dup flag | Preserve repeated receptions; mark suspicion; replay same eventId idempotent | unit/integration / R02,R10 |
| T13 | Counter 100→90→105 and delayed earlier measurement | Discontinuity flagged; no invented ordering; exclude ambiguous usage interval | unit / R12,R13 |
| T14 | Retained packet only after subscribe, no current publish | Last retained value visible as unknown-age; no fresh hardware indication | integration / R08 |
| T15 | Refresh, route navigation, StrictMode, logout, expiry | One socket per tab app session, accurate snapshot, logout closes/revokes; no localStorage auth | e2e / R05–R07 |
| T16 | 20 users, separate sites, forged room and URL device IDs | Same authorized data; cross-site/API/socket/export denied; no leakage | security/integration / R05 |
| T17 | Known cumulative Wh: 1000→1125→1250, verified epoch | 250Wh=0.25kWh; at TEST tariff ₹8/kWh estimate ₹2.00; unknown-unit variant blocked | unit/integration / R12,R13 |
| T18 | Local midnight/month boundary, missing boundary, reset, tariff change | Half-open correct period; incomplete coverage disclosed, revisions reproducible | unit/integration / R12 |
| T19 | Counter input incremental with ambiguous duplicates | Verified billing disabled even when unit known | unit / R13 |
| T20 | Voltage rule TEST high=250, clear=245, debounce=3s | 251 for <3s no alert; sustained fresh violation opens once; clear≤245 resolves; stale pauses electrical evaluation | unit/integration / R14 |
| T21 | Two users acknowledge, repeated request and restart | Idempotent acknowledgement, durable actor/time, resolution independent | integration / R14 |
| T22 | CSV label begins =,+,-,@ and cross-site request | Formula cells escaped, telemetry numeric columns preserved, denied unauthorized export | security / R11 |
| T23 | Database-down history query | 503 with retry guidance, no fabricated rows or empty-success | integration/e2e / R11 |
| T24 | 360–1920px, keyboard, zoom, reduced motion, large values | Design checklist passes; no overflow or unreadable statuses | visual/e2e / R17 |
| T25 | RTT 800ms, 1% loss, 400kbps, hidden→visible tab | No unbounded backlog, age stays honest, resync on return; report degraded latency separately | e2e/load / R18 |
| T26 | Warm 50 packets/s, 20 clients, 15min after 2min warmup | p95 display≤1s; p99≤2s; no unexplained sample loss; bounded buffers | load / R18 |
| T27 | New backend startup with DB down | Unready until configuration/authorization loaded; no unregistered broadcast | integration / R05,R10 |
| T28 | Production build with no URL, HTTP or localhost URL; search bundle for secret names/values | Build fails on invalid URL; no broker credential in assets | unit/security / R01,R05 |

## Latency measurement methodology
Assign eventId and monotonic server receipt time at MQTT callback entry; record parseComplete/cacheUpdated/spoolDurable/socketEmit/dbCommitted. Browser records arrival via performance.now(), store commit, rendered eventId and next animation frames. A double requestAnimationFrame after commit is a practical paint proxy, not absolute proof of physical display scanout. Playwright additionally waits for the DOM to contain that eventId/value; optionally capture controlled video for physical display validation.

Do not subtract raw browser Date.now() from server timestamps without clock calibration. Run 20 clock probes, use minimum-RTT midpoint offset; log RTT/2 uncertainty and periodically recalibrate. Report estimated receipt-to-paint and uncertainty. Add a same-server-clock conservative upper bound: browser sends display ACK only after render/paint proxy; server monotonic ACK time minus receive time includes return-network delay. If upper-bound p95≤1s the target is conservatively met; if it fails while calibrated estimate passes, record both and resolve uncertainty before signoff.

Measure visible metric changes and chart updates separately. To account for UI coalescing, track every eligible sample: superseded samples are reported as such, not hidden from latency denominator. Main acceptance workload must let each channel update visibly (1Hz); chart batch interval ≤250ms. Foreground visibility, CPU/browser version, network RTT, timestamp uncertainty, count of missing ACKs and DB/spool state recorded. Missing eligible render ACKs count as failures. Synthetic workload proves software path only. Real device packets verify actual hardware path separately. Boot-to-first-publish requires a synchronized external power-on log or firmware instrumentation; not derivable from current CSV.

## Hardware checklist: evidence required, not performed
H01: authorized staging/production read-only subscription receives actual packets from each board; capture redacted raw packets, envelope QoS/retain, server eventId, DB row and browser value for the same event. Repeat each configured physical channel with known safe loads and a suitable reference meter operated by the hardware owner. Confirm wiring/mapping and units.
H02: ESP32 off/on three cycles per board. Record power-on observation, first packet, first displayed value, stale/offline transition and counter reset behavior. Report separate boot delay and receipt-to-display delay.
H03: simultaneous prototype1/prototype2 with same raw channel ID; desktop, Android and iPhone logged in; refresh and switch devices. Verify matching event IDs/values and independent device identity.
H04: authorized backend restart, broker reconnect and DB outage in staging; recovery logs, retained-packet behavior, spool reconciliation and data-gap report. Do not fault-inject on company production without an approved maintenance window.
H05: verify every enabled CH01–CH05 mapping on each board; absent hardware remains “not configured”. Do not invent five physical measurements to pass a checklist.
H06: reference energy measurement over known interval, counter reboot/wrap behavior and applicable tariff evidence. Hardware owner and company sign billing eligibility; otherwise release monitoring with billing disabled.

## Evidence format and release gate
Each run stores test ID, commit, environment, versions, command, start/end, result, observed/expected, logs/screenshots with secrets redacted, event IDs, residual limitations and reviewer. Hardware tests default BLOCKED, never mocked PASS. A docs completeness check is not an application test. Maintain docs/evidence/ and progress.md; stop advancing when a mandatory gate fails.
