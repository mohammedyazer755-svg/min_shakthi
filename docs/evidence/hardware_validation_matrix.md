# Hardware Validation Matrix (H01–H06)

**Inspection Date:** 2026-10-16T18:13:19.290Z  
**Overall Status:** **BLOCKED (Mandatory Physical Prerequisites Documented)**  
**Notice:** Test fixtures and synthetic data are strictly forbidden from fabricating a hardware pass.

---

## Hardware Gates Summary

| ID | Title | Status | Primary Blocker / Prerequisite |
|---|---|---|---|
| **H01** | End-to-End Real Packet Receipt & Reference Meter Cross-Check | **BLOCKED** | Physical ESP32 hardware boards and reference meter operator not present in local CI/developer environment. |
| **H02** | ESP32 Power Cycle (3 Cycles) & Stale/Offline State Transitions | **BLOCKED** | Physical power switching apparatus and firmware reboot instrumentation not available in automated test runner. |
| **H03** | Simultaneous Multi-Device Isolation on Matching Raw Channel IDs | **BLOCKED** | Requires simultaneous physical transmission from distinct prototype boards; software isolation verified in T02/T07. |
| **H04** | Authorized Outage Recovery & Retained Packet Reconciliation in Staging | **BLOCKED** | Staging outage injection forbidden without authorized company maintenance window and live ESP32 fleet. |
| **H05** | Physical CH01–CH05 Mapping Verification for Each Board | **BLOCKED** | Pending physical load confirmation sheet from electrical owner (docs/OPEN_QUESTIONS.md Q02). |
| **H06** | Billing Eligibility & Metrology Calibration Sign-Off | **BLOCKED** | Energy counter units and metrology semantics unconfirmed. Billing explicitly suppressed (isCostVerified=false). |

---

## Detailed Gate Analysis and Protocol for Staging Hardware Trials

### H01: End-to-End Real Packet Receipt & Reference Meter Cross-Check
- **Status:** BLOCKED
- **Blocker Summary:** Physical ESP32 hardware boards and reference meter operator not present in local CI/developer environment.
- **Required Prerequisites for Sign-Off:**
  1. Physical ESP32 boards (prototype1 and prototype2) powered and transmitting
  1. Authorized read-only access to broker endpoint
  1. Calibrated reference power meter operated by hardware owner on known safe load
  1. Confirmation of voltage/current sensor conversion factors and channel wiring

### H02: ESP32 Power Cycle (3 Cycles) & Stale/Offline State Transitions
- **Status:** BLOCKED
- **Blocker Summary:** Physical power switching apparatus and firmware reboot instrumentation not available in automated test runner.
- **Required Prerequisites for Sign-Off:**
  1. Physical power cut and restore to ESP32 units (3 successive cycles)
  1. External power-on timing log to measure actual boot-to-first-publish delay
  1. Verification of stale (5s) and inferred offline (30s) UI transitions
  1. Counter continuity check across micro-controller reset

### H03: Simultaneous Multi-Device Isolation on Matching Raw Channel IDs
- **Status:** BLOCKED
- **Blocker Summary:** Requires simultaneous physical transmission from distinct prototype boards; software isolation verified in T02/T07.
- **Required Prerequisites for Sign-Off:**
  1. Concurrent live telemetry from prototype1/channel1 and prototype2/channel1
  1. Multi-client test (Desktop, Android, iOS) verifying isolated device state
  1. No cross-device collision or UI state contamination across device switcher

### H04: Authorized Outage Recovery & Retained Packet Reconciliation in Staging
- **Status:** BLOCKED
- **Blocker Summary:** Staging outage injection forbidden without authorized company maintenance window and live ESP32 fleet.
- **Required Prerequisites for Sign-Off:**
  1. Authorized staging environment with scheduled broker restart
  1. Database connection pause and recovery under live hardware packet stream
  1. Spool recovery validation and missing data gap reporting

### H05: Physical CH01–CH05 Mapping Verification for Each Board
- **Status:** BLOCKED
- **Blocker Summary:** Pending physical load confirmation sheet from electrical owner (docs/OPEN_QUESTIONS.md Q02).
- **Required Prerequisites for Sign-Off:**
  1. Physical channel load assignments confirmed by electrical owner
  1. Validation that unconfigured slots display em-dash without synthetic padding
  1. Board configuration versions saved to database with optimistic concurrency

### H06: Billing Eligibility & Metrology Calibration Sign-Off
- **Status:** BLOCKED
- **Blocker Summary:** Energy counter units and metrology semantics unconfirmed. Billing explicitly suppressed (isCostVerified=false).
- **Required Prerequisites for Sign-Off:**
  1. Controlled energy measurement over verified test duration (Wh/kWh)
  1. Signed calibration certificate from hardware owner and company finance officer
  1. Official tariff rate approval (₹/kWh)


---

## Handover Policy for Uncalibrated Hardware
As mandated by **docs/OPEN_QUESTIONS.md (Q01–Q04)** and **docs/PRD.md**, all energy and billing computations remain **explicitly suppressed** in the software interface (`isCostVerified: false`, `cost: null`). Monitoring can be deployed in production for active power, voltage, current, and frequency, while metrology-grade billing remains suppressed until the hardware owner and company finance officer sign off on **H06**.
