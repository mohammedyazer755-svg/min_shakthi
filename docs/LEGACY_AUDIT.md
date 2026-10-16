# Legacy audit
Audited 16 October 2026. Evidence is from the supplied ZIP, not proof of the exact deployed commit. Line numbers below are relative to minsakthi-energy-dashboard-main/. Credentials are intentionally omitted. No broker writes or deployed account actions were performed.

## Findings
| ID / severity | Evidence | Finding and consequence | Required replacement |
|---|---|---|---|
| A01 / P0 | src/login.tsx:247–269; src/App.tsx:23–31 | Client compares embedded credentials and trusts a localStorage flag. Anyone can bypass the route guard; this is not server authentication. | Rotate any reused credentials, remove embedded values; server sessions and site authorization. |
| A02 / P0 | server.js:14–23,260–293 | Open CORS, unauthenticated HTTP and socket broadcasts expose readings. CORS is not an authorization layer. | Exact origins, authenticated API/socket middleware and authorized rooms. |
| A03 / P0 | server.js:109; src/useliveEnergy.ts:49–60,73–78 | Channel-only keys merge devices. Snapshot can mix boards. | Composite identity throughout cache, SQL, events, selectors and exports. |
| A04 / P1 | src/useliveEnergy.ts:15–16 | Missing environment setting falls back to the viewer’s localhost. | Production configuration must fail build/start for localhost or HTTP. |
| A05 / P1 | server.js:64–83,98–103 | Real topic-space-device packets are already supported; eight-field packets are not. Only NaN is rejected; empty numeric tokens become zero and Infinity survives. Envelope topic and IDs are unchecked. | Three-form parser, strict finite grammar, topic/ID validation and errors. |
| A06 / P1 | server.js:118–152; src/useliveEnergy.ts:73–97 | Assumes channel0–4 and returns zero for unseen channels. Any prior packet implies connected forever. Power >10 implies active, not connectivity. | Configurable mapping, null values, age transitions and separate load state. |
| A07 / P1 | server.js:193–195 | Missing device falls back to prototype2. | Await selection/configuration; no invented device. |
| A08 / P1 | server.js:214–250; overall.tsx:88–135; channel.tsx:79–127 | Timer stamps cached values every second; readings continue after hardware silence. RAM history disappears on restart and client history on navigation. | Persist actual receipt events, real gaps and server query history. |
| A09 / P1 | src/useliveEnergy.ts:22–34,45–69 | Every hook mount creates its own socket and initial HTTP fetch. Fetch response can overwrite newer socket data. Pages each invoke it; simultaneous duplication is possible if mounted together, not proven for current mutually exclusive routes. | Shared provider/store, ordered snapshot protocol, teardown and reconnect tests. |
| A10 / P1 | src/realtime.tsx:146–200 | Randomly chooses a cached channel every 2.5s and says “Live reading updated”. This is generated activity, not an MQTT event. | Event-derived activity with eventId and receipt time. |
| A11 / P1 | src/DashboardLayout.tsx:121–149,191–194,288–293 | Hardcoded device-connected, prototype2, alert count 3 and MQTT-live labels. | State from shared authenticated diagnostics and alert count. |
| A12 / P1 | src/DashboardLayout.tsx:249–252 | Sign-out only navigates; local auth flag survives. | Revoke server session, disconnect and clear caches. |
| A13 / P1 | src/notifications.tsx:369–391,583–633 | Browser-only events and hardcoded thresholds; history lost on unmount, no shared acknowledgement. | Backend rule engine and durable lifecycle. |
| A14 / P1 | src/profile.tsx:79–137,450–452 | Settings persist only in browser; thresholds are not linked to alert logic. | Versioned server configuration consumed by backend. |
| A15 / P2 | src/DashboardLayout.tsx:59,76,86,269 | Fixed 248px sidebar and matching left margin; 9–10px labels. Mobile crowding risk apparent in source; no deployed mobile benchmark performed. | Drawer navigation, responsive grid, readable tokens. |
| A16 / P2 | src/login.tsx:6–14,36–69; home.tsx:3–11; notifications.tsx:8–14,57–355 | Continuous 3D ornament and large components add complexity unrelated to monitoring. | Remove 3D dependencies from operational UI; reusable small components. |
| A17 / P1 | package.json:6–10; README.md:1–16; empty file `server` | No backend start/test scripts or operational runbook; Vite template README. No DB migration or automated test files in archive. | Workspace scripts, CI, tests and runbooks. |
| A18 / P2 | vercel.json:1–8; vite.config.ts:1–7 | SPA fallback exists and Vite/Tailwind integration exists. These are useful, not defects. | Preserve deep-link support in new web root; validate routes. |

## What to preserve
The overall separation of MQTT server and React frontend, immediate energy:update emit (server.js:111), connect-time snapshot (289–292), socket cleanup in the hook, bounded chart arrays, and the billing caveat (profile.tsx:493–494) are sound intentions. Reimplement with contracts and tests. Do not describe the old parser as entirely incompatible with the supplied real samples: its principal parser defects are validation and unsupported explicit-topic form.

## Site and screenshot comparison
Public fetch: old /overall redirected to /login; newer root displayed registration/sign-in. No authenticated site session, live speed comparison or source inspection of the newer application occurred. “Faster” remains user-reported, not measured. Attached screenshots supply the visual dashboard evidence.

| Evidence | Observable issue | V2 decision |
|---|---|---|
| image(20261016-143502).png | Ivory/gold identity and white form, but huge serif headline, oversized panel and long prose; decorative curves overlap the text region. | Keep palette; compact sign-in form, short explanatory sentence, sans-serif UI. |
| image(20261016-143557).png | “Device online” and “5 Active” coexist with ESP32-offline warning; redundant status banners, deep cards, truncated channel names. | One coherent header status summary, accurate per-channel age, compact rows and expandable diagnostics. |
| image(20261016-143608).png | Sine-wave illustration labelled 1024 samples/cycle, PF/reactive/THD values and breaker-toggle instruction despite scalar packets; billing values shown while hardware is reported offline. | Remove unsupported waveforms/controls/derived claims. Report real scalar time series and provenance. Offline historical cost is possible in principle, but this screenshot does not establish its provenance. |
| image(20261016-143618).png | Tariff/standards/compliance claims, large headings and dense explanatory labels overwhelm the operational view. | No compliance badge or live-tariff claim without evidence; billing is gated and moved to reports. |

Graininess is user-reported. Screenshots establish typography/density problems, but cannot isolate whether blur comes from fonts, scaling, rasterization or capture. Test native browser rendering at device pixel ratios 1 and 2, 100/125/200% zoom; avoid bitmap text, CSS transforms scaling whole UI and noise overlays.

## Scope limitations
No dependency installation, legacy build, vulnerability scan, network trace or hardware test was run in this documentation task. No original history/report screen source exists in this ZIP; do not attribute unsupported newer-site history behavior to it. Full source inventory includes App, layout, login, home, overall, channel, realtime, notifications, profile, live hook, CSS, entrypoint, package/lock, TypeScript/ESLint/Vite/Vercel configuration and README. Package-lock is present; exact compatibility is a Phase 1 verification gate.
