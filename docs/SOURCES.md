# Sources and evidence boundaries
Reviewed 16 October 2026. Primary local evidence: uploaded ZIP, TECHNICAL_HANDOFF(1).md, ASTRA_MASTER_PROMPT(1).md, MQTT_TEST_FIXTURES(1).csv and four supplied images. Local audit findings take precedence over unverified assertions in the handoff.

Reference websites were fetched live with cache bypass: https://minsakthi-energy-dashboard.vercel.app/overall redirected to /login; https://min-sakthi-energy-os.vercel.app/ showed account registration. Protected dashboards were not entered. Dashboard visual observations derive from the supplied screenshots, not an authenticated browsing claim. No response-speed comparison was measured.

Primary technical documentation checked through web retrieval:
- https://socket.io/docs/v4/delivery-guarantees/ — ordering versus default at-most-once arrival; supports explicit application resynchronization.
- https://render.com/docs/free — free service inactivity/sleep restrictions; supports always-on paid service choice.
- https://render.com/docs/disks — persistent disk availability and deployment constraints; disk-backed deployment is not assumed zero downtime.
- https://render.com/docs/web-services — public web service configuration and environment setup.
- https://nodejs.org/en/about/previous-releases — Node 24 LTS baseline; pin current supported patch when implementing.

Library/package patch versions, provider dashboard settings, pricing and limits must be rechecked during implementation. These links justify platform choices; proposed capacities, buffer sizes, timing thresholds and UX tokens are design decisions, not measured guarantees or vendor promises. Standards/tariffs visible in screenshots were not validated and are intentionally not adopted.
