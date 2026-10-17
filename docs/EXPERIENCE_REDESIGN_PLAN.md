# MIN-SAKTHI experience redesign

Status: redesign implementation plan. The immediate ESP-status correction is separate work tracked in `progress.md`; the seven visual/feature phases remain future implementation work.

Prepared: 17 October 2026. Source baseline inspected: `39216ff` in `D:\Minshakthi`, including the latest authentication modal fix. Use the current checkout when implementing; do not reset to this commit. This plan complements the existing engineering plan rather than replacing its telemetry, security, or hardware requirements.

## 1. Recommended direction

**A cinematic dark entrance that opens into a calm, warm-white energy workspace.**

Keep the black, light, and brass identity of the public homepage. Give it one memorable dimensional object and carefully choreographed movement. Inside, use white surfaces, warm ivory backgrounds, generous spacing, crisp typography, clear charts, and short transitions. The connection between the two experiences is the same brand mark, restrained brass accent, consistent geometry, and an elegant sign-in transition.

The impression should come from composition, material, depth, and continuity. A person checking their electricity readings should immediately understand what is happening and what they can do next.

Recommended signature feature: **Power Event Investigator**. It automatically records electrical threshold events and device-data interruptions, builds a before/during/after timeline, and explains what the evidence shows. Users can replay an incident instead of watching a dashboard continuously. This replaces the earlier map proposal at the user's request.

### Priority requirement: fast, truthful ESP state

This is a correctness prerequisite for every redesign phase and the new feature. The current fix is tracked separately in `progress.md`; a working browser socket, available broker, or open subscription must never imply that an ESP is sending readings.

- Track browser connection, backend ingestion health, broker subscription, selected-device activity, and per-channel freshness as separate facts.
- New non-retained packets must update values and restore live status without a refresh. Aim for <=2s from backend receipt to visible value under normal network/database conditions; measure actual results rather than promising instantaneous delivery.
- Use one shared cadence-aware freshness policy on backend, browser, diagnostics, coverage, and all current-value cards. Browser aging continues without incoming snapshots. Missing snapshots invalidate health; reconnect and device changes cannot retain a false Live state.
- Current five-second device configuration: warn at six seconds without a fresh packet, infer offline at ten seconds. For a one-second publisher: warn at 1.5s and infer offline at 5s. Re-evaluate every 250ms in the visible browser. These bounds start at the last accepted packet and exclude browser suspension/network delays.
- Freshness is per channel. A silent channel must age out even if another channel is active. Show partial coverage. Retained, delayed, duplicate/replayed, invalid, and cached history must not prove present hardware activity. Do not replace missing readings with zero.
- Keep old readings only in explicitly timestamped history/detail contexts; blank expired current metrics. With broken broker/worker/database/browser transport, say connection interrupted or unknown rather than diagnosing an ESP power cut.
- The existing seven-field packets cannot prove physical power state, device event time, or whether a newly received payload was buffered in transit. “Offline” from silence is inferred. Do not invent an instantaneous physical-off guarantee.
- Firmware follow-up: inspect the actual ESP publish loop, add one-second presence heartbeats with device/session identity, configure an MQTT Last Will offline message before connecting, publish explicit online/session state and graceful-off status, and keep reconnect non-blocking. Use authenticated per-device presence topics, sequence/session validation, and broker ACLs. Validate retained presence with a heartbeat lease; an old retained online flag never proves current presence. No firmware source is present in the inspected repository, so this requires the hardware firmware as an implementation input.
- A sudden loss of power cannot publish an off packet. Broker Will delivery depends on disconnect/keep-alive detection; choose and measure a short compatible keep-alive rather than promising zero latency. Firmware presence alone must not make missing sensor measurements look fresh.
- Hardware exit gate: perform repeated ESP on/off cycles, log actual publisher intervals and backend/browser timestamps, verify first valid readings arrive without refresh, verify loss is detected within the configured lease, and distinguish ESP loss from broker, Wi-Fi, backend, and browser failures. Use a private test broker for automated tests; never publish test readings to production.

## 2. Inspection findings

This is a source audit of the current checkout, informed by the authenticated dashboard screenshot captured during the preceding deployment verification. That screenshot is a prior visual baseline, not a newly captured visual test of this planning commit.

| Current evidence | Effect on the experience | Planned response |
|---|---|---|
| `styles/tokens.css` already defines an ivory/white palette, but `styles/index.css` sets the document to dark colors. Many pages and components use `--dark-*` directly. | A global color flip would leave incompatible borders, hover states, chart labels, inputs, and overlays. | Introduce scoped semantic theme tokens and migrate components deliberately. |
| `LandingPage.tsx`, its CSS, and `LightRays.tsx` provide a strong black editorial entrance with cursor-responsive light. | There is already a recognizable visual identity worth developing. | Preserve its character; simplify the content and add one deliberate 3D focal point. |
| `AppShell.tsx` also renders light rays and has nine equally prominent navigation entries. | The working interface feels theatrical and crowded. | Remove ambient WebGL from the workspace and group navigation around user tasks. |
| `AppShell` renders `StatusSummary` without live health props; the component defaults to healthy/connected. The device selector also has a permanently green indicator. | A polished interface can incorrectly imply that everything is operating normally. | Pass actual health and freshness state; missing evidence means unknown, not healthy. |
| `Overview.tsx` repeats device/socket/broker details and exposes display ACK timing. Its voltage/current/frequency summaries can include last samples from offline channels. | Technical clutter and potentially misleading freshness distract from the measurements. | Use one concise status summary; move diagnostics into a detail panel; apply a consistent freshness policy. |
| `MeasurementChart.tsx` uses a fixed SVG viewBox with `w-full h-auto`; an explicit height is only applied to its empty state. | Charts can grow much taller than intended at wide widths. The prior screenshot shows the chart dominating the screen. | Use a controlled responsive plotting height and reliable resize measurements. |
| Many page labels and inputs use 10–12px text, dark inline styles, and custom one-off card markup. | Dense, inconsistent reading and interaction, especially on phones. | Build shared light primitives and raise essential text sizes. |
| `App.tsx` switches pages through local `activeRoute` state. | No durable URL context for page, device, filters, or channel selection; no deliberate transition lifecycle. | Add URL-backed navigation while keeping auth and the live telemetry provider mounted. |
| Server routes already enforce roles for alert acknowledgement, rule editing, device updates, and audit access. The navigation presents the same entries to everyone. | Ordinary users see controls and concepts intended for administrators. | Align visible navigation and controls with existing permissions. Preserve server enforcement. |
| `LandingPage.tsx` uses `Math.random()` to fluctuate readings and hard-coded channel measurements, with labels such as “Live Ingestion Active” and “Broker Active.” Some copy also describes local disk spooling and unverified calibration. | The public presentation overstates what the displayed values prove and does not match the deployed cloud path. | Remove simulated operational readings and unsupported claims. Use an abstract energy illustration on the public page. |
| `LightRays` already has intersection-based visibility handling and a DPR cap. The inspected code does not explicitly handle reduced motion or document visibility. Landing CSS has independent infinite animations. | Existing optimizations are useful, but accessibility and background GPU behavior need a complete policy. | Reuse the optimizations; add reduced-motion, visibility, touch, failure, and pause behavior. |

Primary change surfaces: `apps/web/src/App.tsx`, `styles/`, `components/AppShell.tsx`, `components/StatusSummary.tsx`, `components/MeasurementChart.tsx`, `components/Auth/`, `components/LightRays/`, and the current page components. Keep `auth/`, `live/`, the API contracts, and MQTT behavior stable unless a documented correctness fix requires a focused change.

## 3. Visual specification

### Public landing page: dark and dimensional

- Black/charcoal canvas, ivory type, restrained warm metal highlights.
- One hero: concise headline, one supporting sentence, one primary “Open dashboard” action, and a dimensional energy-meter object.
- Keep the existing brand mark and lighting character. Compose the hero scene and light as one visual focal point rather than stacking multiple large animated canvases.
- Follow the hero with three short benefits, a clearly identified product preview, and a final sign-in action. Move implementation architecture and detailed specifications out of the main public journey.
- Remove role-specific email shortcuts from public sign-in. Use one accessible email/password form, password-manager support, and a clear error state. Roles come from the authenticated session.
- Public graphics are explanatory artwork. Do not label invented values or decorative activity as live telemetry.

### Authenticated workspace: light and precise

| Token/use | Proposed value |
|---|---|
| Canvas | Warm ivory `#F7F6F2` |
| Main surface | White `#FFFFFF` |
| Quiet inset surface | `#F0F1EC` |
| Primary text | Charcoal `#202321` |
| Secondary text | `#5D625D` |
| Divider | `#DDDCD5` |
| Accent decoration | Brass `#A38445` |
| Accent text | Dark brass `#725719` |
| Secondary data accent | Teal `#176B65` |
| Positive / warning / critical | `#176344` / `#805300` / `#A52E2E` |

Validate actual foreground/background combinations, hover states, disabled controls, focus rings, and chart contrast in implementation. Decorative brass is not the default small-text color.

- Keep the existing system/Inter font stack. Use 16px body copy, 14px controls/table content, 12–13px secondary metadata, 24–28px page headings, and 30–36px primary metrics. Use tabular numerals for readings.
- Use 4/8/12/16/24/32px spacing, 12–16px surface radii, fine borders, and subtle shadows. Depth should distinguish interactive or raised surfaces, not surround every element with glow.
- Desktop: a quiet left navigation rail, a compact top bar, and a centered content area. Tablet: compact navigation. Mobile: a simple bottom navigation or accessible menu with the same destinations and safe-area spacing.
- Default to light inside. A new theme picker and a second fully supported workspace theme are outside this release.
- Scope themes at the public/workspace roots with semantic variables such as `--surface`, `--text-primary`, `--border`, and `--accent`. Portal dialogs and body backgrounds must receive the appropriate theme too.

## 4. What each person needs to see

Primary navigation for everyone: **Overview, Channels, Insights, Alerts**. Put personal preferences and sign-out under the account menu. Insights contains Trends, History, and Reports as secondary views, preserving existing functionality.

For administrators, add a visually separated **Manage** destination with Devices & mappings, Alert rules, Diagnostics, and Audit. Operators receive an appropriate read-only diagnostics entry and their existing acknowledgement action. Do not build a new user-provisioning system in this redesign.

| Capability | Viewer / ordinary user | Operator | Admin |
|---|---|---|---|
| Overview, channel readings, incidents, trends, reports/history | Read own site | Read own site | Read own site |
| Active alerts and explanations | Read | Read and acknowledge | Read and acknowledge |
| Personal display preferences | Own account | Own account | Own account |
| Raw packets, broker state, delivery timing | Not in primary journey | Diagnostics | Diagnostics |
| Device/channel configuration | No edit controls | Read-only as currently allowed | Edit with existing conflict handling |
| Alert rules | Read relevant explanations | Read relevant explanations | Create/edit/delete |
| Audit log | Hidden | Hidden | Existing admin access |

This table is a presentation target, not permission to loosen API authorization. UI hiding is not a security boundary. Preserve or test existing server checks, site isolation, and direct-link behavior. Never remove useful measurement states merely to make a screen look clean.

### Overview content budget

1. Page title, selected device, and one honest status: “Receiving readings”, “Some channels unavailable”, “Waiting for readings”, or “Connection interrupted”. Last-received time belongs nearby.
2. Three primary cards: **Power now**, **Channels reporting**, **Alerts needing attention**. Secondary voltage, current, and frequency belong in a compact expandable measurements row.
3. One power trend, approximately 260–320px high on desktop and 200–240px on mobile, with a short time-range control. Preserve visible data gaps and an accessible table alternative.
4. Compact configured-channel list, with only the selected channel's extra detail revealed. An incident summary appears only when there is a relevant recent event.
5. A short attention area only when something needs action. No empty blocks of promotional copy.

If no channels are fresh, show an unavailable value and timestamp, not a live total. If coverage is partial, say so. A disconnected channel’s previous reading can be shown as a timestamped last reading in its detail view. A real zero remains zero. Do not sum nested meters or infer a complete site total from channel wiring that has not been confirmed.

Rename user-facing concepts where helpful: “Loads” can explain “Channels”; “Last received” can replace “Receipt time”; “Connection details” can contain broker and socket terminology. Preserve raw identifiers in admin/detail views.

## 5. Motion and 3D specification

Every important interaction should feel connected; important information must remain immediately readable. These durations are proposed design budgets, to be adjusted after measurement and usability checks.

| Interaction | Treatment | Budget |
|---|---|---|
| Hover/focus/press | Color or border transition; clickable card lifts up to 2px; press scale down to 0.99 | 120–160ms |
| Workspace page change | Persistent shell; content opacity plus 6–10px vertical movement | 180–240ms |
| Selected navigation item | Short underline/pill movement | 160–200ms |
| Modal or detail drawer | Opacity and small directional translation; focus moves correctly | 180–240ms |
| Landing to workspace | Brief dark-to-ivory reveal after authentication succeeds; same brand anchor | 280–360ms |
| Hero object | One subtle settling entrance; optional pointer response capped around 3 degrees | 500–650ms entrance |
| Filter or device change | Stable layout; genuine pending state; old-device values cannot masquerade as new-device values | Immediate input response |
| Live numerical update | Update directly with stable width; optional short background emphasis | No rolling counters |
| Chart / incident selection | Gentle emphasis of the selected series/event | 120–180ms |
| Save/error/alert acknowledgement | Local feedback near the action; reserve space for messages | 150–200ms |

Implementation approach:

- CSS transitions/animations are the baseline. Prefer transform and opacity; avoid `transition: all` and continuous layout animations. This follows the browser rendering guidance in [web.dev](https://web.dev/articles/animations-guide).
- Use native View Transitions only as progressive enhancement, with feature detection and a CSS/immediate fallback. Coordinate snapshots with committed React state; never depend on unsupported React APIs or upgrade React solely for this work. The API supports transitions between SPA DOM states ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API)).
- Keep the auth provider, device selection, and single telemetry subscription outside page transition boundaries. Animation must not duplicate sockets, replay page-entry movement on each packet, or delay incoming measurements.
- For the landing hero, prototype one small actual 3D meter/energy assembly with the existing OGL dependency. Use simple geometry and lighting, no large model download or post-processing stack. Lazy-load it after essential content. Pair it with a designed static SVG/CSS fallback.
- Incident replay uses a clear SVG chart and an accessible event list with normal buttons. No perspective distortion of ordinary cards, forms, tables, or charts.
- Native scrolling, no scroll hijacking, custom cursor, mandatory intro, camera fly-through on navigation, audio, or repeated number animation. At most one ambient animated region is visible, on the landing page only.
- Respect `prefers-reduced-motion` in CSS and JavaScript: remove parallax, continuous movement, translation, and hero animation; keep navigation and data usable immediately. Add a persistent “Reduce animation” preference where useful; the OS preference always takes precedence. The design adopts the animation-disable principle described by [W3C](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html).
- Stop rendering when the hero is offscreen or the document is hidden; dispose resources on unmount. Disable pointer parallax for touch/coarse pointers. Handle WebGL failure/context loss and reduced-data preferences where supported. Provide a pause control for any continuing decorative animation; a static hero is a valid default on mobile.
- Prototype DPR caps of 1.5 desktop / 1 mobile, then tune on measured devices. Marketing graphics must never be imported into the authenticated workspace's initial chunk.

## 6. Signature feature: Power Event Investigator

### User story

“Tell me what happened while I was away, show the readings before and after it, and help me understand whether this was an electrical event or a monitoring interruption.”

### First release

- Automatically create a persistent incident when an enabled electrical alert rule opens or a configured device stops reporting beyond its lease. This evaluator runs on the backend while no browser is open. Distinguish electrical threshold breaches, device silence, and monitoring-path interruptions.
- Capture a configurable context window, initially two minutes before and two minutes after detection. A durable pending state waits for the after-window; missing samples remain visible gaps. Store source event references and mapping/rule versions so later edits cannot rewrite what an incident meant.
- Show a short summary such as “Channel 2 exceeded the configured voltage limit for 8 seconds” or “No readings arrived for 12 seconds; power state unconfirmed.” Include affected channels, duration, last received time, recovery, and available evidence.
- Open an event to a timeline with before/during/after readings. A scrubber highlights synchronized voltage, current, power, and frequency at the selected recorded timestamp. Replay is historical, labeled, paused by default, and never alters the live values.
- Show broker/worker availability and known presence evidence alongside telemetry. When evidence cannot distinguish power loss, Wi-Fi loss, or firmware failure, say “Cause not confirmed.” Do not call every silence a mains outage.
- Reuse existing alerts for acknowledgement and admin thresholds. Group related events into one incident with stable IDs, deduplication, bounded windows, cooldown, and recovery hysteresis; a flapping link must not generate hundreds of cards.
- Offer a downloadable incident report containing the timeline, source timestamps, rule, observed extrema, missing-data coverage, acknowledgement, and evidence limitations. Start with a print-ready HTML report and CSV evidence, rather than a new PDF service.
- Users see a concise “What happened” view; admins can expand rule, mapping, delivery, and raw evidence details. Put incidents under Insights and link from Alerts; no extra top-level navigation item is needed.

### Data rules and boundaries

- Summaries are deterministic and explainable from recorded rules and samples. An LLM subscription is unnecessary for the first version. Do not invent causes, safety guarantees, forecasts, automatic appliance identification, money savings, or calibration.
- Use server-receipt timestamps explicitly until the firmware supplies trusted event time. Recovery detection and durations are bounded by publish cadence and connectivity; show uncertainty and gaps.
- Add an additive incident/evidence schema and tenant-scoped authenticated APIs; protect list, detail, replay, and report exports. Operators/admins use existing acknowledgement permissions; only admins change detection rules.
- Persist device monitoring transitions in the worker and distinguish worker/broker downtime. A worker restart must not fabricate a device outage covering its own observation gap. Incident state, grouping, source IDs, and partial-window completion survive restarts.
- Bound storage/query windows, paginate the incident list, define retention and deletion of dependent evidence, and apply CSV formula escaping. Preserve relevant evidence when normal telemetry retention expires, or clearly report evidence expiry.
- Retained readings and broker replay do not establish a physical return online. Missing data is not zero load. Unknown energy units and hardware calibration stay explicit.

### Feature acceptance

A user can answer “What happened, when, for how long, and what evidence supports it?” without reading packets. A private-broker scenario with all browsers closed must produce one durable incident and an honest recovery timeline. Reopen after a worker restart and verify the same record, gaps, and pending evidence window. Test threshold breaches, ESP silence, broker failure, duplicate delivery, flapping, retained-only reconnects, missing after-data, role/site isolation, keyboard replay, and export accuracy. No physical root-cause claim is made without supporting evidence.

## 7. Phased implementation

Implement in order. Each phase ends with a runnable application, relevant verification, screenshots where visual behavior changes, and an update to `progress.md`. Do not mark unperformed checks as passed. Use the matching prompts in `prompts/EXPERIENCE_REDESIGN_PROMPTS.md`.

### Phase 1 — Design foundation and truthful states

**Scope:** Record baseline routes/screens and installed dependency versions. Establish scoped light/public theme tokens, reusable surface/text/control primitives, typography, focus styles, and a shared freshness/status presentation policy. Wire real health into the shell, eliminate healthy defaults, and remove fabricated live claims from the public page. Preserve the current authentication focus fix.

**Files:** `styles/tokens.css`, `styles/index.css`, shared components, `AppShell`, `StatusSummary`, `Overview`, `LandingPage`, a short design-spec addendum under `docs/`.

**Exit gate:** Landing stays dark; a representative authenticated screen is coherent in light; missing health renders unknown; old readings cannot look current; contrast and keyboard focus are checked. Test state derivations rather than CSS implementation details.

### Phase 2 — Navigation, roles, and workspace shell

**Depends on:** Phase 1.

**Scope:** Implement the light shell, responsive navigation, role-aware Manage area, account menu, one device picker, and URL-backed page/device/channel context. Consolidate Insights secondary navigation. Preserve old destinations with appropriate redirects/aliases where necessary. Keep auth and telemetry mounted across navigation. Integrate real configured devices instead of assuming a fixed production device list where an authorized endpoint exists.

**Files:** `App.tsx`, `AppShell`, navigation/route configuration, auth access helpers, device selection components. Use a maintained router compatible with the existing React version if needed; document the dependency decision and avoid a framework migration.

**Exit gate:** Direct links, refresh, Back/Forward, keyboard navigation, mobile drawer focus/close, login redirect, and viewer/operator/admin visibility work. Existing server authorization remains enforced. One telemetry subscription survives route changes and switches devices correctly.

### Phase 3 — Clean workspace pages

**Depends on:** Phase 2.

**Scope:** Apply the content budget to Overview. Rework Channels, Insights/Trends, History, Reports, Alerts, personal Settings, and all Manage views with shared light components. Correct chart sizing and mobile presentation; preserve chart gaps and accessible data tables. Put raw packet IDs, latency, broker details, rule mechanics, and audit detail in appropriate secondary/admin views. Reserve a compact conditional incident summary without shipping a dummy feature widget.

**Files:** Existing page components, `MeasurementChart`, tables, metric cards, empty/error states, form primitives.

**Exit gate:** All authenticated screens and overlays use the light theme. Essential content is readable at 360px and 200% zoom. Loading, empty, error, partial, stale, offline, and permission-denied states are intentional. Existing reports, export, preferences, alert acknowledgement, and mapping conflict flows still work.

### Phase 4 — Seamless motion system

**Depends on:** Phase 3.

**Scope:** Create centralized motion tokens/helpers and apply the interaction specification to navigation, auth handoff, tabs, menus, drawers, filters, selection, feedback, and buttons. Add progressive View Transitions only where beneficial, with an immediate fallback. Implement reduced-motion and animation preference behavior across existing CSS and JavaScript effects.

**Files:** Shared motion styles/hooks/components, shell and route boundaries, AuthModal, shared primitives, preferences integration if persisted.

**Exit gate:** Every major action has consistent feedback without delaying the action. Rapid route changes and reduced-motion mode work. No duplicate mounted interactive pages, lost focus, repeated socket initialization, or transitions on every telemetry packet. Record a short interaction capture and a performance trace.

### Phase 5 — Cinematic public entrance

**Depends on:** Phases 1 and 4; implement after Phase 4 in this sequence.

**Scope:** Refine the current dark page into the concise hero/benefits/preview structure. Build one lazy-loaded OGL dimensional object with the existing light identity and a quality static fallback. Keep sign-in accessible immediately. Remove public role shortcuts, unverified operational claims, and fake readings. Tune the transition from dark sign-in to the light workspace.

**Files:** `LandingPage`, its CSS, `LightRays`, AuthModal, a dedicated lazy-loaded hero scene and static SVG fallback.

**Exit gate:** Desktop feels dimensional; mobile remains fast and legible. Touch, reduced-motion, WebGL-disabled, hidden-tab, offscreen, and slow-load cases work. No hero resource is needed to sign in or use the workspace. No invisible rendering loop remains after navigating away.

### Phase 6 — Power Event Investigator

**Depends on:** Phases 2–4; follows Phase 5 in the delivery sequence.

**Scope:** Implement the backend incident lifecycle and evidence windows, then authenticated list/detail/export APIs, the plain-language incident summary, historical replay, and report export. Reuse the alert engine and existing acknowledgement permissions. Surface concise incident context in Overview, Alerts, and Insights. See section 6 for the full data, deduplication, restart, and uncertainty contract.

**Files:** Suggested `features/incidents/` UI, contracts, additive database migration and repository methods, worker evaluator, incident routes, and focused regression tests. No new hardware control or invented data source.

**Exit gate:** Demonstrate detection while browsers are closed, durable context before/after, gap-preserving replay, correct grouping/recovery, worker restart safety, role/site isolation, accessible controls, and accurate export. Distinguish missing telemetry from confirmed electrical events. Use isolated private-broker scenarios; hardware cause attribution remains unverified until physical tests pass.

### Phase 7 — Validation and release preparation

**Depends on:** All previous phases.

**Scope:** Run the appropriate build, lint, type, and behavioral suites. Verify complete browser flows, roles, responsive layouts, accessibility, and performance. Fix inconsistencies. Produce final screenshots/recordings, a dependency/bundle delta, and release notes. Prepare a preview and a rollback reference when deployment is within the active request; this planning request alone does not instruct a new production release.

**Exit gate:** Review the checklist below. Record measured results and any hardware/device checks still unavailable. Ship only under the applicable deployment authorization, then verify the published commit and full application flow.

## 8. Verification and performance gates

- Screens: public homepage, sign-in/error, Overview, channel detail, Trends, History, Reports, Alerts, incident list/replay/report, personal preferences, admin devices/rules/diagnostics/audit.
- Sizes: 360/390px mobile, 768px tablet, 1280/1440px desktop; 200% zoom; keyboard-only use. Use desktop emulation as an initial check, with a real mid-range phone check recorded separately when available.
- Themes: no dark flashes while entering the light workspace; no dark inputs/tooltips/portal surfaces left inside; landing retains its deliberate dark treatment.
- Data: fresh, partial, no readings, stale/offline, retained-only, zero values, auth expiry, reconnect, and unknown health. Live labels reflect real state, not a timer or random number.
- Auth/roles: login, focused password entry, refresh, logout, reload, forbidden direct links, viewer/operator/admin controls, site isolation. Use isolated test accounts for role checks, not newly invented production credentials.
- Charts: bounded height, readable ticks, stable axes/timezone, zero/one-point cases, gaps preserved, accessible table, no smoothing that invents readings.
- Motion: reduced-motion and animation preference, touch, fast repeated navigation, canceled transitions, focus restoration, hidden/offscreen canvas pause, and WebGL failure.
- Performance: record a repeatable baseline and final build on the same conditions. Working targets are LCP <=2.5s, INP <=200ms, CLS <=0.1 when measurable under representative conditions; lab checks are proxies and cannot establish field percentiles. Aim for smooth ~60fps desktop interactions, without sustained long tasks from effects.
- Bundle budget: target <=30KB additional compressed JavaScript on the authenticated startup path for this redesign. Lazy-load hero graphics and large secondary views. Record actual compressed size and explain any justified change rather than quietly exceeding the budget.
- Reliability: navigation must not increase active socket count, API polling, or telemetry-to-display delay. Never publish test fixtures to production MQTT to make visual checks look populated.
- Usability: ask representative ordinary users to find current power, identify an unavailable channel, find an alert, and explain a recorded incident from its timeline. Ask an admin to find and update a channel mapping. If users need instructions, simplify before adding more animation.

## 9. Working rules for implementation prompts

Each phase prompt is standalone but assumes earlier exit gates passed. Read this plan, `progress.md`, relevant repository instructions, and the existing design/security/data documentation first. Re-inspect changed files rather than assuming the baseline is unchanged. Keep user edits intact and make focused changes. Do not automatically deploy or work through later phases just because their prompts are in the same file.

The prompt collection is also printed in the terminal by the planning pass. Reprint it with:

```powershell
Get-Content -Encoding UTF8 -LiteralPath .\prompts\EXPERIENCE_REDESIGN_PROMPTS.md
```

## 10. Source notes

The visual direction, palette, durations, content limits, feature scope, and proposed budgets above are project design recommendations. Browser guidance was checked against the following primary documentation on 17 October 2026:

- [MDN: View Transition API](https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API) — progressive view changes and transition lifecycle.
- [web.dev: High-performance CSS animations](https://web.dev/articles/animations-guide) — transform/opacity and rendering costs.
- [W3C: Animation from Interactions](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html) — allowing motion to be disabled. This is an AAA criterion adopted as a design requirement here; it does not by itself establish whole-site WCAG conformance.
- [OASIS: MQTT 3.1.1, Will and Keep Alive](https://docs.oasis-open.org/mqtt/mqtt/v3.1.1/os/mqtt-v3.1.1-os.html) — abrupt-disconnect detection and Will timing are broker/keep-alive dependent, not instantaneous physical-power notifications.
