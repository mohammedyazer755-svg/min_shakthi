/**
 * Phase 6 Hardware Validation Runner (H01–H06)
 * Strict Contract: Never claims live hardware compatibility from fixture tests.
 * Consumes securely injected endpoint context; returns BLOCKED with documented
 * prerequisites when physical hardware or owner confirmation is absent.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface HardwareGate {
  id: 'H01' | 'H02' | 'H03' | 'H04' | 'H05' | 'H06';
  title: string;
  prerequisites: string[];
  status: 'PASS' | 'BLOCKED' | 'FAIL';
  reason: string;
  evidencePath?: string;
}

export function evaluateHardwareGates(): HardwareGate[] {
  const hardwareTestMode = process.env['HARDWARE_TEST_MODE'] === 'true';
  const ownerConfirmed = process.env['HARDWARE_OWNER_CONFIRMED'] === 'true';
  const brokerEndpoint = process.env['HARDWARE_BROKER_URL'] || process.env['MQTT_URL'];

  const gates: HardwareGate[] = [
    {
      id: 'H01',
      title: 'End-to-End Real Packet Receipt & Reference Meter Cross-Check',
      prerequisites: [
        'Physical ESP32 boards (prototype1 and prototype2) powered and transmitting',
        'Authorized read-only access to broker endpoint',
        'Calibrated reference power meter operated by hardware owner on known safe load',
        'Confirmation of voltage/current sensor conversion factors and channel wiring',
      ],
      status: 'BLOCKED',
      reason: 'Physical ESP32 hardware boards and reference meter operator not present in local CI/developer environment.',
    },
    {
      id: 'H02',
      title: 'ESP32 Power Cycle (3 Cycles) & Stale/Offline State Transitions',
      prerequisites: [
        'Physical power cut and restore to ESP32 units (3 successive cycles)',
        'External power-on timing log to measure actual boot-to-first-publish delay',
        'Verification of stale (5s) and inferred offline (30s) UI transitions',
        'Counter continuity check across micro-controller reset',
      ],
      status: 'BLOCKED',
      reason: 'Physical power switching apparatus and firmware reboot instrumentation not available in automated test runner.',
    },
    {
      id: 'H03',
      title: 'Simultaneous Multi-Device Isolation on Matching Raw Channel IDs',
      prerequisites: [
        'Concurrent live telemetry from prototype1/channel1 and prototype2/channel1',
        'Multi-client test (Desktop, Android, iOS) verifying isolated device state',
        'No cross-device collision or UI state contamination across device switcher',
      ],
      status: 'BLOCKED',
      reason: 'Requires simultaneous physical transmission from distinct prototype boards; software isolation verified in T02/T07.',
    },
    {
      id: 'H04',
      title: 'Authorized Outage Recovery & Retained Packet Reconciliation in Staging',
      prerequisites: [
        'Authorized staging environment with scheduled broker restart',
        'Database connection pause and recovery under live hardware packet stream',
        'Spool recovery validation and missing data gap reporting',
      ],
      status: 'BLOCKED',
      reason: 'Staging outage injection forbidden without authorized company maintenance window and live ESP32 fleet.',
    },
    {
      id: 'H05',
      title: 'Physical CH01–CH05 Mapping Verification for Each Board',
      prerequisites: [
        'Physical channel load assignments confirmed by electrical owner',
        'Validation that unconfigured slots display em-dash without synthetic padding',
        'Board configuration versions saved to database with optimistic concurrency',
      ],
      status: 'BLOCKED',
      reason: 'Pending physical load confirmation sheet from electrical owner (docs/OPEN_QUESTIONS.md Q02).',
    },
    {
      id: 'H06',
      title: 'Billing Eligibility & Metrology Calibration Sign-Off',
      prerequisites: [
        'Controlled energy measurement over verified test duration (Wh/kWh)',
        'Signed calibration certificate from hardware owner and company finance officer',
        'Official tariff rate approval (₹/kWh)',
      ],
      status: 'BLOCKED',
      reason: 'Energy counter units and metrology semantics unconfirmed. Billing explicitly suppressed (isCostVerified=false).',
    },
  ];

  // If environment provides authenticated real hardware access, verify live hardware packets
  if (hardwareTestMode && ownerConfirmed && brokerEndpoint) {
    console.log(`[HARDWARE] Live hardware validation mode active on broker: ${brokerEndpoint}`);
    // Live hardware verification logic would execute here when authorized hardware is present
  }

  return gates;
}

export function writeHardwareEvidence(gates: HardwareGate[]): void {
  const evidenceDir = path.resolve(__dirname, '../docs/evidence');
  if (!fs.existsSync(evidenceDir)) {
    fs.mkdirSync(evidenceDir, { recursive: true });
  }

  const markdown = `# Hardware Validation Matrix (H01–H06)

**Inspection Date:** ${new Date().toISOString()}  
**Overall Status:** **BLOCKED (Mandatory Physical Prerequisites Documented)**  
**Notice:** Test fixtures and synthetic data are strictly forbidden from fabricating a hardware pass.

---

## Hardware Gates Summary

| ID | Title | Status | Primary Blocker / Prerequisite |
|---|---|---|---|
${gates.map((g) => `| **${g.id}** | ${g.title} | **${g.status}** | ${g.reason} |`).join('\n')}

---

## Detailed Gate Analysis and Protocol for Staging Hardware Trials

${gates
  .map(
    (g) => `### ${g.id}: ${g.title}
- **Status:** ${g.status}
- **Blocker Summary:** ${g.reason}
- **Required Prerequisites for Sign-Off:**
${g.prerequisites.map((p) => `  1. ${p}`).join('\n')}
`
  )
  .join('\n')}

---

## Handover Policy for Uncalibrated Hardware
As mandated by **docs/OPEN_QUESTIONS.md (Q01–Q04)** and **docs/PRD.md**, all energy and billing computations remain **explicitly suppressed** in the software interface (\`isCostVerified: false\`, \`cost: null\`). Monitoring can be deployed in production for active power, voltage, current, and frequency, while metrology-grade billing remains suppressed until the hardware owner and company finance officer sign off on **H06**.
`;

  fs.writeFileSync(path.join(evidenceDir, 'hardware_validation_matrix.md'), markdown, 'utf-8');
  console.log(`[EVIDENCE] Written to ${path.join(evidenceDir, 'hardware_validation_matrix.md')}`);
}

export async function runHardwareValidation(): Promise<{ passed: boolean; blockedCount: number }> {
  console.log('='.repeat(70));
  console.log('MIN-SAKTHI V2 - HARDWARE VALIDATION SUITE (H01–H06)');
  console.log('='.repeat(70));

  const gates = evaluateHardwareGates();
  let blockedCount = 0;
  let passCount = 0;

  for (const gate of gates) {
    console.log(`[${gate.status}] ${gate.id}: ${gate.title}`);
    console.log(`       Reason: ${gate.reason}`);
    if (gate.status === 'BLOCKED') blockedCount++;
    if (gate.status === 'PASS') passCount++;
  }

  console.log('-'.repeat(70));
  console.log(`Summary: ${passCount} PASSED, ${blockedCount} BLOCKED (Physical Hardware Required)`);
  console.log('Notice: Synthetic fixtures strictly rejected from passing live hardware gates.');
  console.log('='.repeat(70));

  writeHardwareEvidence(gates);

  // Return non-zero status when hardware prerequisites are missing as specified in DEPLOYMENT_RUNBOOK.md
  // ("Hardware runner consumes securely injected endpoint/access context, requires explicit real-hardware mode
  // and returns BLOCKED/nonzero when prerequisites are missing")
  const isPrerequisiteMet = passCount === gates.length;
  return {
    passed: isPrerequisiteMet,
    blockedCount,
  };
}

if (process.argv[1]?.endsWith('hardware-test.ts') || process.argv[1]?.endsWith('hardware-test.js')) {
  runHardwareValidation()
    .then(({ passed, blockedCount }) => {
      // If run as contract check with --contract-check flag, exit 0 so CI can report BLOCKED without crashing
      const isContractCheck = process.argv.includes('--contract-check') || process.env['CONTRACT_CHECK'] === 'true';
      if (isContractCheck) {
        console.log(`[CONTRACT CHECK] Verified H01–H06 gate definitions (${blockedCount} gates documented BLOCKED).`);
        process.exit(0);
      }
      process.exit(passed ? 0 : 2); // Exit code 2 indicates BLOCKED prerequisites
    })
    .catch((err) => {
      console.error('Fatal hardware test error:', err);
      process.exit(1);
    });
}
