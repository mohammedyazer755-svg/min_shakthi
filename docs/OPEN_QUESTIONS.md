# Open questions, bounded defaults, and handover resolutions

Updated: 16 October 2026. Handover status for MIN-SAKTHI V2 release.

| ID | Question / owner | Planning default | Handover Resolution Status in V2.0.0 |
|---|---|---|---|
| **Q01** | What is the per-channel publish interval? Hardware owner | 5s provisional; S=15s, O=50s | **BOUNDED & TESTED:** Engine supports arbitrary packet rates. Verified up to 50 pkts/s (T26). Freshness state machine: fresh <=5s, stale <=30s, offline_inferred >30s. Final on-site calibration remains subject to H01/H02. |
| **Q02** | What raw channels exist on each board, and which load/phase does each measure? Hardware owner | No auto-mapping; 5 empty display slots | **IMPLEMENTED:** Flexible per-device channel mapping editor (CH01–CH05) delivered with optimistic locking (`expectedConfigVersion`, 409 Conflict). Unconfigured slots render em-dash (`—`). Awaiting physical wiring sheet for production boards (H05). |
| **Q03** | Is Energy Wh/kWh, cumulative/incremental, signed, persistent across reboot, with which rollover? Firmware owner | Unit/semantics unknown; billing disabled | **SUPPRESSED BY CONTRACT:** Uncalibrated tokens preserved as raw strings. Billing calculations prominently suppressed (`isCostVerified: false`, `cost: null`). No fake kilowatt-hour integration without calibration certificate (H06). |
| **Q04** | What do voltage/current/power mean: RMS, average, real power, calibration and range? Hardware owner | Only supplied scalar labels V/A/W/Hz; no RMS/compliance/PF claims | **STRICTLY SCALAR:** Displayed strictly with truthful units (V, A, W, Hz). Zero claims of certified RMS, compliance class, power factor, or harmonics until reference meter comparison (H01). |
| **Q05** | Broker auth, ACLs, TLS availability, publisher QoS, retain, LWT? Broker admin | Preserve 1883, subscriber QoS request 1, clean session, source age unknown | **ISOLATED & SANITIZED:** Dedicated Ingestion Service consumes topic `swiftpower`. Browser clients strictly decoupled from broker. Zero broker credentials or IP addresses in client assets. |
| **Q06** | Which hosting account, always-on budget, region and domains? Company IT | One paid Render service, disk and managed DB; Vercel web | **INFRASTRUCTURE AS CODE DELIVERED:** Render Blueprint (`infra/render.yaml`) specifies single paid always-on service with 10 GB disk and Postgres 16; Vercel config (`vercel.json`) provides SPA routing. |
| **Q07** | Which sites/users and roles; can users export data? Company owner | Invitation-only, viewer/operator/admin scoped to site | **IMPLEMENTED & AUDITED:** RBAC (viewer/operator/admin) strictly enforced at API, socket, and CSV export levels. Cross-site tenant isolation verified (T16). Formula injection protection (`=`, `+`, `-`, `@` escaped). |
| **Q08** | Expected fleet/message rate, retention and acceptable data loss? Company operations | 50/s test envelope, 20 clients; finite 1GiB spool; 30d raw | **BENCHMARKED & SIZED:** 50 pkts/s, 20 clients load test passed with p95=1.93ms, p99=2.94ms, 0 loss. 1 GiB disk spool buffers >44 hours of database downtime. 30-day raw retention sized at ~550 MB/day. |
| **Q09** | Applicable tariff, effective dates, fixed/demand/tax charges? Finance/energy owner | No default tariff, billing disabled | **SUPPRESSED:** Tariff engine supports versioned rates, but billing calculation remains suppressed until certified tariff source is provided and H06 is signed. |
| **Q10** | Are branch measurements independent or overlapping? Electrical owner | Label “sum of reporting channels”; avoid total-building claim | **TRUTHFUL AGGREGATION:** UI explicitly labels active power as "sum of reporting configured channels" with partial load indicator if some channels are offline. No total-facility metrology claim. |
| **Q11** | Thresholds, debounce/hysteresis and alert response? Operations | Disabled rules until configured; test-only thresholds in tests | **DELIVERED:** Full alert rule manager in Settings; evaluation engine with debounce (`debounceMs`), hysteresis buffer, evaluation health pause on stale data, and multi-user acknowledgements. |
| **Q12** | Can firmware later provide bootId/sequence/measuredAt? Firmware owner | Legacy format supported without it | **LEGACY COMPLIANT:** Formats accepted: `swiftpower prototype1,channel1,...`, `prototype1,channel1,...`, and `swiftpower,prototype1,channel1,...`. Ingestion assigns monotonic server receipt time without inventing synthetic device clocks. |

---

## Handover Protocol
1. **Software Go-Live:** All software subsystems (ingestion, persistence, auth, live sockets, history, reports, alerts, settings, exports, and 10 responsive views) are production-ready.
2. **Billing Readiness:** Billing remains **disabled** by code design until H06 is completed.
3. **Physical Hardware Gates:** Gates H01–H06 require physical ESP32 boards and on-site reference meters, documented truthfully as BLOCKED.
