import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { parseLegacyMqttPacket } from '../src/parse.js';

interface ParserTestCase {
  id: string;
  testOnly?: boolean;
  topic: string;
  payload: string;
  valid: boolean;
  expected?: {
    deviceId: string;
    channelId: string;
    voltage: number;
    current: number;
    power: number;
    frequency: number;
    energyRaw: string;
    energyUnit: string;
    deviceTimestamp: null;
  };
  error?: string;
  qualityIncludes?: string[];
}

describe('Legacy MQTT Parser Protocol Tests', () => {
  const fixturesPath = path.resolve(__dirname, '../../../tests/fixtures/parser_cases.json');
  const cases: ParserTestCase[] = JSON.parse(fs.readFileSync(fixturesPath, 'utf-8'));

  for (const c of cases) {
    it(`parses fixture case: ${c.id}`, () => {
      const result = parseLegacyMqttPacket(c.topic, c.payload, {
        configuredTopic: 'swiftpower',
      });

      if (c.valid) {
        expect(result.valid).toBe(true);
        if (result.valid) {
          expect(result.data.deviceId).toBe(c.expected?.deviceId);
          expect(result.data.channelId).toBe(c.expected?.channelId);
          expect(result.data.voltage).toBeCloseTo(c.expected?.voltage ?? 0, 2);
          expect(result.data.current).toBeCloseTo(c.expected?.current ?? 0, 2);
          expect(result.data.power).toBeCloseTo(c.expected?.power ?? 0, 2);
          expect(result.data.frequency).toBeCloseTo(c.expected?.frequency ?? 0, 2);
          expect(result.data.energyRaw).toBe(c.expected?.energyRaw);
          expect(result.data.energyUnit).toBe('unknown');
          expect(result.data.deviceTimestamp).toBeNull();

          if (c.qualityIncludes) {
            for (const q of c.qualityIncludes) {
              expect(result.quality).toContain(q);
            }
          }
        }
      } else {
        expect(result.valid).toBe(false);
        if (!result.valid) {
          expect(result.error).toBe(c.error);
        }
      }
    });
  }

  it('runs original 9 CSV fixture cases byte-for-byte (T01)', () => {
    const csvPath = path.resolve(__dirname, '../../../tests/fixtures/original_mqtt.csv');
    const content = fs.readFileSync(csvPath, 'utf-8');
    const lines = content.trim().split('\n').slice(1); // skip header

    for (const line of lines) {
      if (!line.trim()) continue;

      // CSV columns: case,mqtt_topic,raw_payload,expected_device,expected_channel,expected_voltage,expected_current,expected_power,expected_energy,expected_frequency,expect_valid
      // Parse CSV line taking quotes into account
      const regex = /(?:^|,)(?:"([^"]*)"|([^,]*))/g;
      const row: string[] = [];
      let match;
      while ((match = regex.exec(line)) !== null) {
        row.push(match[1] !== undefined ? match[1] : match[2] ?? '');
        if (regex.lastIndex >= line.length) break;
      }

      const caseId = row[0];
      const topic = row[1] ?? 'swiftpower';
      const payload = row[2] ?? '';
      const expectedDevice = row[3];
      const expectedChannel = row[4];
      const expectedVoltage = row[5] ? parseFloat(row[5]) : null;
      const expectedCurrent = row[6] ? parseFloat(row[6]) : null;
      const expectedPower = row[7] ? parseFloat(row[7]) : null;
      const expectedEnergy = row[8] || null;
      const expectedFrequency = row[9] ? parseFloat(row[9]) : null;
      const expectValid = row[10]?.trim() === 'true';

      const result = parseLegacyMqttPacket(topic, payload, {
        configuredTopic: 'swiftpower',
      });

      if (expectValid) {
        expect(result.valid, `Case ${caseId} expected valid`).toBe(true);
        if (result.valid) {
          expect(result.data.deviceId).toBe(expectedDevice);
          expect(result.data.channelId).toBe(expectedChannel);
          expect(result.data.voltage).toBeCloseTo(expectedVoltage!, 2);
          expect(result.data.current).toBeCloseTo(expectedCurrent!, 2);
          expect(result.data.power).toBeCloseTo(expectedPower!, 2);
          expect(result.data.energyRaw).toBe(expectedEnergy);
          expect(result.data.frequency).toBeCloseTo(expectedFrequency!, 2);
        }
      } else {
        expect(result.valid, `Case ${caseId} expected invalid`).toBe(false);
      }
    }
  });
});
