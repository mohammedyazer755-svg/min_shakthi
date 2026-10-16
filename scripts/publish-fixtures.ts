/**
 * Isolated Test Fixture Publisher
 * Strict Safety: Refuses to publish to production broker (192.155.92.123).
 */

import mqtt from 'mqtt';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface TestCase {
  id: string;
  topic: string;
  payload: string;
  valid: boolean;
  retained?: boolean;
}

export async function publishTestFixtures(options: {
  brokerUrl?: string;
  topic?: string;
  caseIds?: string[];
  interleave?: boolean;
  delayMs?: number;
}): Promise<{ publishedCount: number }> {
  const brokerUrl = options.brokerUrl || process.env['TEST_MQTT_URL'] || 'mqtt://localhost:18883';
  const topic = options.topic || 'swiftpower';
  const delayMs = options.delayMs ?? 50;

  // STRICT SAFETY ENFORCEMENT
  if (brokerUrl.includes('192.155.92.123')) {
    throw new Error(
      '[CRITICAL SAFETY VIOLATION] Test publisher strictly refused to publish to production broker 192.155.92.123!'
    );
  }

  const fixturesPath = path.resolve(__dirname, '../tests/fixtures/parser_cases.json');
  const allCases: TestCase[] = JSON.parse(fs.readFileSync(fixturesPath, 'utf-8'));

  const casesToPublish = options.caseIds
    ? allCases.filter((c) => options.caseIds?.includes(c.id))
    : allCases;

  return new Promise((resolve, reject) => {
    const client = mqtt.connect(brokerUrl, {
      clientId: `fixture-publisher-${Date.now()}`,
      clean: true,
      connectTimeout: 5000,
    });

    client.on('error', (err) => {
      client.end(true);
      reject(err);
    });

    client.on('connect', async () => {
      let published = 0;

      try {
        if (options.interleave) {
          // Interleaved device scenario (T02)
          const p1 = 'prototype1,channel1,239.67,0.14,33.22,88.11,49.98';
          const p2 = 'prototype2,channel1,230.00,2.00,460.00,100.00,50.00';

          for (let i = 0; i < 3; i++) {
            await new Promise<void>((res, rej) => {
              client.publish(topic, p1, { qos: 1 }, (err) => (err ? rej(err) : res()));
            });
            published++;
            if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));

            await new Promise<void>((res, rej) => {
              client.publish(topic, p2, { qos: 1 }, (err) => (err ? rej(err) : res()));
            });
            published++;
            if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));
          }
        } else {
          for (const tc of casesToPublish) {
            await new Promise<void>((res, rej) => {
              client.publish(
                tc.topic || topic,
                tc.payload,
                { qos: 1, retain: Boolean(tc.retained) },
                (err) => (err ? rej(err) : res())
              );
            });
            published++;
            if (delayMs > 0) {
              await new Promise((r) => setTimeout(r, delayMs));
            }
          }
        }

        client.end(true, {}, () => {
          resolve({ publishedCount: published });
        });
      } catch (publishErr) {
        client.end(true);
        reject(publishErr);
      }
    });
  });
}

// Direct invocation CLI runner
if (process.argv[1] === __filename) {
  const isInterleave = process.argv.includes('--interleave');
  publishTestFixtures({ interleave: isInterleave })
    .then((res) => {
      console.log(`[FIXTURE PUBLISHER] Published ${res.publishedCount} test packets.`);
      process.exit(0);
    })
    .catch((err) => {
      console.error('[FIXTURE PUBLISHER] Failed:', err);
      process.exit(1);
    });
}
