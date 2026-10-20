# Interior overview review

Local production-build review, 20 October 2026. Screenshots use the existing `?view=workspace` preview with no authenticated session or simulated electrical readings. The connection-lost/checking states are expected in this preview.

- `desktop.png` / `desktop-full.png`: 1440px desktop viewport / full page.
- `wide.png`: 1920px desktop viewport.
- `tablet.png`: 768px tablet viewport.
- `mobile.png` / `mobile-full.png`: 390px mobile viewport / full page.
- `small-mobile.png`: 360px mobile viewport.
- `review.json`: measured layouts and browser interaction results.

Browser checks cover overflow, four summary cards, five channel slots, truthful unavailable status, metric selector buttons, the electrical snapshot toggle, the detailed-readings disclosure, reduced motion, and uncaught exceptions. Captures use reduced motion to show the settled layout consistently.

`npm run build:web` passed. All 32 tests passed using `npx vitest run tests/unit/phase3-workspace.test.ts tests/unit/live-status.test.ts tests/unit/phase2-navigation.test.ts`.

This is local UI evidence. Authentication, backend/database connectivity, MQTT ingestion, and hardware were not tested. No deployment was performed.
