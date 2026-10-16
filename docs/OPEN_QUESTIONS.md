# Open questions and bounded defaults
Planning proceeds now. Unknowns block only the affected correctness/go-live claims, not the entire build. Owners below are role assignments to confirm, not named commitments.

| ID | Question / owner | Planning default | Required evidence and gate |
|---|---|---|---|
| Q01 | What is the per-channel publish interval? Hardware owner | 5s provisional; S=15s,O=50s | Time ≥100 actual messages/channel; confirm burst cycle. Before freshness signoff. |
| Q02 | What raw channels exist on each board, and which load/phase does each measure? Hardware owner | No auto-mapping; 5 empty display slots | Wiring sheet + controlled load test. Phase 6 hardware gate. |
| Q03 | Is Energy Wh/kWh, cumulative/incremental, signed, persistent across reboot, with which rollover? Firmware owner | Unit/semantics unknown; billing disabled | Firmware definition and controlled consumption/reset test. Phase 5–6 billing gate. Incremental requires event IDs. |
| Q04 | What do voltage/current/power mean: RMS, average, real power, calibration and range? Hardware owner | Only supplied scalar labels V/A/W/Hz; no RMS/compliance/PF claims | Reference-meter comparisons and documented accuracy. Before metrology claims. |
| Q05 | Broker auth, ACLs, TLS availability, publisher QoS, retain, LWT? Broker admin | Preserve 1883, subscriber QoS request 1, clean session, source age unknown | Authorized broker settings and envelope capture. Before security/delivery signoff. No secrets in reply. |
| Q06 | Which hosting account, always-on budget, region and domains? Company IT | One paid Render service, disk and managed DB; Vercel web | Owner provisions actual URLs/env and same-site domain or accepts re-login limitation. Phase 6. |
| Q07 | Which sites/users and roles; can users export data? Company owner | Invitation-only, viewer/operator/admin scoped to site | Approved access matrix; security tests. Phase 3/6. |
| Q08 | Expected fleet/message rate, retention and acceptable data loss? Company operations | 50/s test envelope, 20 clients; finite 1GiB spool; 30d raw | Measured bytes/row, database sizing and approved outage budget. Before production. |
| Q09 | Applicable tariff, effective dates, fixed/demand/tax charges? Finance/energy owner | No default tariff, billing disabled | Approved tariff source and calculation tests; no screenshot rate copied. |
| Q10 | Are branch measurements independent or overlapping? Electrical owner | Label “sum of reporting channels”; avoid total-building claim | Wiring/topology evidence before additive consumption totals. |
| Q11 | Thresholds, debounce/hysteresis and alert response? Operations | Disabled rules until configured; test-only thresholds in tests | Approved operating limits and escalation ownership. Phase 5. |
| Q12 | Can firmware later provide bootId/sequence/measuredAt? Firmware owner | Legacy format supported without it | Required for exact incremental billing, trustworthy source order and physical freshness, not basic monitoring. |

No architecture document can resolve these by guessing from screenshots. Record answers with evidence links and config version in progress.md. Monitoring may be released with unverified energy/billing explicitly disabled; do not call it verified metering.
