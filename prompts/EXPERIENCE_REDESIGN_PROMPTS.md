# MIN-SAKTHI redesign: implementation prompts

Copy one phase at a time. These prompts implement `docs/EXPERIENCE_REDESIGN_PLAN.md`; they do not replace the earlier engineering phase prompts. Complete and verify the current phase before starting the next.

## PHASE 1 — Design foundation and truthful states

```text
Implement Phase 1 of docs/EXPERIENCE_REDESIGN_PLAN.md in this repository.

Read the full redesign plan, progress.md, repository instructions, and the relevant design/data documentation. Inspect the current checkout and preserve existing user changes, including the AuthModal password-focus fix. This phase establishes the foundation; do not implement later phases or deploy.

Keep the public landing dark and establish a warm-ivory/white authenticated theme with scoped semantic tokens. Create or consolidate shared surface, typography, input, button, status, and focus styles. Migrate the shell and one representative Overview slice so the approach is demonstrably coherent, including portal/theme behavior. Do not merely recolor --dark-* globally.

Fix the inspected truthfulness issues: StatusSummary must receive actual health and connection state, missing health must be unknown, device dots must not default to healthy, and offline last samples must not appear as current readings. Remove randomly generated public telemetry and unsupported live/calibration/spooling claims; use an abstract non-operational illustration instead. Preserve real zero, partial coverage, timestamps, and existing telemetry contracts.

Read the plan's Priority requirement: fast, truthful ESP state. Preserve and verify the shared cadence-aware expiration policy, locally aging coverage/current cards, retained-message handling, healthy-transport-only offline inference, and no false Live from an open socket. For the configured 5s publisher warn at 6s and infer offline at 10s; for a 1s publisher warn at 1.5s and infer offline at 5s. Measure first-packet-to-display latency. Record the firmware prerequisite for 1s heartbeats, Last Will, session-aware presence, and physical power-cycle verification; do not claim those firmware changes are implemented without the source/hardware.

Verify build/type/lint checks appropriate to the changed files, focused tests for health/freshness derivations, keyboard focus, and contrast. Capture the dark landing and representative light workspace at desktop/mobile sizes. Record baseline evidence, changed files, checks, and limitations in progress.md. End with a concise handoff and remaining Phase 1 issues. Do not claim unfinished gates passed.
```

## PHASE 2 — Navigation, roles, and workspace shell

```text
Implement Phase 2 of docs/EXPERIENCE_REDESIGN_PLAN.md. Read the plan, repository instructions, and progress.md; verify Phase 1 is complete and resolve relevant prerequisites first. Preserve current user edits. Implement this phase only.

Create the light responsive application shell and task-based navigation: Overview, Channels, Insights, Alerts; personal preferences/sign-out in the account menu; separate Manage views for admin tasks. Group Trends, History, and Reports under Insights. Give operators existing acknowledgement and appropriate diagnostic access. Use the plan's role matrix while preserving server authorization and site isolation. Do not add a user-provisioning system.

Replace ephemeral activeRoute-only navigation with URL-backed page/device/channel context. Use a compatible maintained router if justified and record that decision. Support direct links, refresh, Back/Forward, auth redirects, and useful legacy destination aliases. Keep authentication and the single telemetry subscription above route transitions. Source selectable devices from authorized configured data where available; handle no devices and inaccessible selections honestly.

Implement mobile navigation with keyboard/focus behavior, touch targets, and one clear device selector/status area. Verify role visibility, forbidden direct links, reload/history behavior, logout, mobile focus restoration, and device switching without duplicate sockets. Run relevant build/lint/type and behavioral checks. Update progress.md with screenshots and actual results. Do not redesign every page, add 3D, deploy, or start Phase 3 in this run.
```

## PHASE 3 — Clean light workspace pages

```text
Implement Phase 3 of docs/EXPERIENCE_REDESIGN_PLAN.md after checking Phase 2's gates in progress.md. Read repository instructions and inspect the current shared components before editing. Preserve user changes and existing backend behavior.

Apply the plan's light design system and content budgets to Overview, Channels, Insights/Trends, History, Reports, Alerts, personal preferences, and Manage views. Overview should show a concise real status, Power now, Channels reporting, Alerts needing attention, one bounded trend, and compact channel content. Move secondary electrical measurements into a detail row and technical diagnostics into the appropriate view. Retain existing reports/export, alert acknowledgement, configuration conflicts, and audit access.

Replace repeated inline dark styles with shared semantic components. Fix MeasurementChart sizing with an explicit responsive plotting height and measured width, preserving visible gaps, real zeros, labels, accessible tables, and timezone semantics. Ensure stale/offline values are clearly last readings, never silently live. Build deliberate loading, empty, partial, error, and denied states. Do not populate placeholders with fake operational data or ship a dummy incident widget.

Verify every authenticated view at 360/390, 768, and 1440px, plus 200% zoom and keyboard use. Exercise changed functional flows and meaningful chart/data-state tests; run relevant type/build/lint gates. Update progress.md with screen evidence and remaining issues. Keep major motion and the incident investigator for their later phases. Do not deploy.
```

## PHASE 4 — Seamless motion and interaction

```text
Implement Phase 4 of docs/EXPERIENCE_REDESIGN_PLAN.md. Read the motion specification and previous exit gates in progress.md, then inspect current navigation, auth, live telemetry, and CSS animation lifecycles. Implement only this phase.

Create centralized motion tokens/helpers and apply consistent short feedback to page navigation, auth handoff, selected tabs, buttons, menus, drawers, filters, device changes, saves, and errors. Keep the application shell persistent. Use transform/opacity CSS as the baseline. Add native View Transitions only with feature detection, committed React-state coordination, and an immediate/CSS fallback; do not upgrade React for this feature.

Respect OS reduced-motion preference in CSS and JavaScript. Provide the plan's animation preference without allowing it to override an OS request for less motion. Avoid scroll hijacking, repeated counter animation, global pointer effects, and transition: all. Keep live readings immediate, cancel obsolete transitions, preserve keyboard focus, and prevent duplicate interactive pages or socket subscriptions. Device changes must never present old-device data as new-device data.

Verify reduced-motion, rapid navigation, modal focus/escape/restoration, touch input, fallback browsers, authentication transitions, and real telemetry updates during animation. Record a short interaction capture and performance trace; fix effect-driven layout shifts or sustained long tasks. Run relevant checks, update progress.md with results, and provide a concise handoff. Do not implement the hero or incident investigator yet and do not deploy.
```

## PHASE 5 — Cinematic dark landing and sign-in

```text
Implement Phase 5 of docs/EXPERIENCE_REDESIGN_PLAN.md after verifying the foundation and motion gates. Inspect the current LandingPage, LightRays, AuthModal, and existing OGL dependency. Keep the recognizable dark editorial identity and the working authentication focus behavior. Implement this phase only.

Simplify the page to a concise hero, three benefits, an honest product preview, and a clear sign-in action. Remove excess architecture prose and public role/email shortcuts. Do not present fictional readings or unverified operational claims as live. Keep normal sign-in usable immediately.

Create one polished, lightweight 3D energy-meter assembly using the existing OGL capability, with simple geometry, restrained warm-metal lighting, a small settling entrance, and optional subtle pointer response. Integrate the current light identity into one composed hero region. Lazy-load the scene and create a designed static SVG/CSS fallback. Avoid a large model, post-processing stack, extra 3D framework, or graphics imported by the authenticated startup path.

Handle reduced motion, touch/coarse pointers, WebGL failure/context loss, viewport visibility, document hiding, and cleanup. Add a pause control if decorative animation continues. Verify desktop composition, mobile readability, slow loading, disabled WebGL, canvas resource disposal, login errors, and dark-to-light entry. Record screenshots, bundle impact, and performance evidence in progress.md. Run relevant checks. Do not implement the incident investigator or deploy.
```

## PHASE 6 — Power Event Investigator

```text
Implement Phase 6 of docs/EXPERIENCE_REDESIGN_PLAN.md. Read its full Power Event Investigator specification, fast ESP-state requirement, and prior gates in progress.md. Inspect the alert engine, worker lifecycle, database repository, history APIs, permissions, and freshness contracts. Implement this phase only.

Build a durable backend incident lifecycle for configured electrical threshold breaches and device-data interruptions, operating with all browsers closed. Capture a bounded context window, initially 2 minutes before/after detection, and persist pending completion/recovery, source IDs, rule/mapping versions, and monitoring-path evidence. Group correlated events with deduplication, cooldown, and hysteresis. A worker/broker outage must not masquerade as a confirmed device power cut. Add an additive schema, tenant-scoped list/detail/export APIs, and recovery after worker restart.

Implement a concise What happened summary and accessible historical timeline/replay under Insights, linked from Alerts and conditional Overview context. Show before/during/after readings, observed duration, gaps, affected channels, recovery, and the evidence behind each statement. Use deterministic summaries; do not invent root causes or add an LLM dependency. Replay is labeled historical, paused by default, keyboard operable, and separate from live values. Add a print-ready HTML report and safe CSV evidence export. Apply existing operator/admin acknowledgement and admin-only rule permissions.

Test private-broker detection with browsers closed, threshold breaches, packet silence versus broker/worker failure, flapping, retained-only reconnects, duplicate delivery, incomplete after-windows, restart durability, evidence retention, changed mappings/rules, role/site isolation, keyboard replay, and report accuracy. Missing data is not zero and receipt timestamps are not device event time. Fixtures remain isolated from production MQTT. Run relevant checks and update progress.md with evidence and limitations. Do not deploy or claim physical root-cause or hardware calibration verification.
```

## PHASE 7 — Validate and prepare release

```text
Complete Phase 7 of docs/EXPERIENCE_REDESIGN_PLAN.md. Read all phase gates, repository instructions, and progress.md. Audit the final implementation, fix remaining integration issues, and use the plan's verification checklist as the acceptance contract.

Run relevant build, lint, type, and behavioral suites. Verify the public page, sign-in and password focus, session refresh/reload/logout, all user views, admin Manage flows, exports, mapping conflicts, incident lifecycle/replay/export, and server-enforced role/site boundaries. Check mobile/tablet/desktop, 200% zoom, keyboard/focus, contrast, reduced motion, missing/stale/retained data, reconnects, and canvas failure. Confirm that no fabricated operational state or permanently healthy default remains. Exercise the plan's ESP power-cycle and fast-state gates; distinguish automated simulation from real hardware evidence.

Measure baseline versus final compressed bundle sizes, chart layout, interaction traces, layout shift, and socket/request counts under consistent conditions. Verify that the hero is lazy-loaded, stops offscreen/hidden, cleans up, and is absent from workspace startup. Record actual mobile hardware checks separately from emulation; unavailable measurements remain unverified. Test whether representative users can find current power, an unavailable channel, an alert, and explain an incident from its timeline without instruction.

Produce final screenshots/interaction captures, concise release notes, measured results, remaining limitations, and a rollback reference. Update progress.md with completed and unperformed gates. Prepare a preview/release only when deployment is part of the active authorization; this prompt does not independently authorize a production push. If deployment is authorized, finish the checks first, publish the reviewed Git commit, and verify browser-to-API-to-database/socket behavior and MQTT worker health afterward. Report the exact resulting state without inventing passes.
```
