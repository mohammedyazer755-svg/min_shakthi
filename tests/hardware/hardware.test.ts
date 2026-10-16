import { describe, it, expect } from 'vitest';
import { evaluateHardwareGates } from '../../scripts/hardware-test.js';

describe('Hardware Verification Contract Suite (H01–H06)', () => {
  it('evaluates all 6 hardware gates (H01 to H06) with detailed prerequisites', () => {
    const gates = evaluateHardwareGates();
    expect(gates).toHaveLength(6);

    const ids = gates.map((g) => g.id);
    expect(ids).toEqual(['H01', 'H02', 'H03', 'H04', 'H05', 'H06']);

    for (const gate of gates) {
      expect(gate.title.length).toBeGreaterThan(5);
      expect(gate.prerequisites.length).toBeGreaterThanOrEqual(2);
      expect(['PASS', 'BLOCKED', 'FAIL']).toContain(gate.status);
    }
  });

  it('strictly reports BLOCKED when real hardware or owner confirmation is absent', () => {
    // Ensure environment is un-mocked
    delete process.env['HARDWARE_TEST_MODE'];
    delete process.env['HARDWARE_OWNER_CONFIRMED'];

    const gates = evaluateHardwareGates();
    for (const gate of gates) {
      expect(gate.status).toBe('BLOCKED');
      expect(gate.reason.length).toBeGreaterThan(10);
    }
  });

  it('strictly enforces billing suppression under uncalibrated hardware (H06)', () => {
    const gates = evaluateHardwareGates();
    const h06 = gates.find((g) => g.id === 'H06');
    expect(h06).toBeDefined();
    expect(h06?.status).toBe('BLOCKED');
    expect(h06?.reason).toContain('Billing explicitly suppressed');
  });

  it('refuses to allow synthetic fixtures to pass hardware gates', () => {
    // Even if parser test fixtures pass 100%, hardware gates must remain BLOCKED
    const gates = evaluateHardwareGates();
    const passedGates = gates.filter((g) => g.status === 'PASS');
    expect(passedGates).toHaveLength(0);
  });
});
