# MIN-SAKTHI ENERGY INTELLIGENCE V2
Architecture and implementation handover · 16 October 2026 · Planning baseline 1.0

This is a documentation package, not an implemented or hardware-certified application. No production broker connection, deployment, authenticated dashboard test or latency benchmark was performed. Original source and all four supplied screenshots were inspected. Public sites were fetched; their protected dashboard behavior was not tested.

## Start here
1. Read docs/LEGACY_AUDIT.md for evidence and docs/PRD.md for scope.
2. Read docs/ARCHITECTURE.md, MQTT_PROTOCOL.md and DATA_MODEL.md together.
3. Copy this package into the root of a fresh repository. Keep the original ZIP separately as a read-only forensic reference; do not commit its credentials.
4. Open that repository in Codex or Antigravity. Paste prompts/PHASE_1.md. Work through exactly six phases, one at a time, with their exit gates.
5. Every agent must inspect and update progress.md. A failed or unperformed gate is not complete.

All six prompts are also collected in docs/PHASE_PROMPTS.md. Test inputs are TEST ONLY; never publish them to the production swiftpower topic. There is deliberately no production demo mode, application code, secret-bearing source copy, or fabricated chart asset in this package.

## Product decision
Preserve the warm ivory, white, charcoal and restrained gold identity. Replace the oversized marketing text, waveform theatre and contradictory indicators with a compact operations interface: selected device, honest status, four summary metrics, one real trend, five mapped channel rows and actionable alerts. Advanced diagnostics belong on their own screen.

## Important boundaries
Energy units, counter semantics, per-device wiring and publish intervals require hardware-owner confirmation. Billing remains disabled until its gates pass. The seven-field protocol cannot prove device event ordering or exact duplicate identity. Single-node durable buffering reduces database-outage loss but cannot recover messages never delivered to the backend.

See docs/OPEN_QUESTIONS.md for owners and evidence required. docs/SOURCES.md records external documentation and reference-site access limits.
