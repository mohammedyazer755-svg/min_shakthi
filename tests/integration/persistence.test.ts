import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { TelemetryPayload } from '@minsakthi/contracts';
import { DurableSpoolManager } from '../../apps/server/src/storage/spool.js';
import { TelemetryPersisterWorker } from '../../apps/server/src/storage/persister.js';
import { MemoryTelemetryRepository } from '../../apps/server/src/storage/db.js';
import { TEST_SITES } from '@minsakthi/db';

function createSamplePayload(deviceId = 'prototype1', channelId = 'channel1', seq = 1): TelemetryPayload {
  return {
    schemaVersion: 1,
    eventId: crypto.randomUUID(),
    serverEpoch: '11111111-1111-4111-8111-111111111111',
    sequence: seq.toString(),
    siteId: TEST_SITES.default.id,
    deviceId,
    channelId,
    receivedAt: new Date().toISOString(),
    deviceTimestamp: null,
    values: {
      voltage: 239.5,
      current: 1.25,
      power: 299.37,
      energyRaw: '100.5',
      frequency: 50.0,
    },
    energyUnit: 'unknown',
    quality: [],
    retained: false,
    persistence: 'pending',
  };
}

describe('Persistence and Spool Durability Suite (R10: T08, T09, T10, T11)', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'minsakthi-spool-test-'));
  });

  afterEach(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup error
    }
  });

  it('T08: Backend restart during spool replay preserves history and prevents duplicate eventId', async () => {
    const spool1 = new DurableSpoolManager({ spoolDir: tempDir });
    const repo = new MemoryTelemetryRepository();
    const persister1 = new TelemetryPersisterWorker(spool1, repo);

    spool1.open();

    // 1. Ingest batch of 5 samples
    const samples = Array.from({ length: 5 }, (_, i) => createSamplePayload('prototype1', 'channel1', i + 1));
    for (const s of samples) {
      const res = spool1.append(s);
      expect(res.ok).toBe(true);
      persister1.onRecordAppended({ offset: res.offset, length: res.length, payload: s });
    }

    // Flush to DB
    await persister1.forceFlush();
    expect(persister1.totalCommittedRecords).toBe(5);

    // 2. Ingest 3 more samples without flushing (uncommitted spool data)
    const pendingSamples = Array.from({ length: 3 }, (_, i) => createSamplePayload('prototype1', 'channel1', i + 6));
    for (const s of pendingSamples) {
      const res = spool1.append(s);
      expect(res.ok).toBe(true);
    }
    spool1.flushSync();
    spool1.close();

    // 3. Simulate backend restart: new server instance opens spool
    const spool2 = new DurableSpoolManager({ spoolDir: tempDir });
    const persister2 = new TelemetryPersisterWorker(spool2, repo);
    spool2.open();

    // Replay uncommitted records from last checkpoint
    const checkpoint = await repo.getCheckpoint('telemetry_persister');
    const startOffset = checkpoint?.offset ?? 0;

    const replayRes = spool2.recoverAndReplay(startOffset, (rec) => {
      persister2.onRecordAppended(rec);
    });

    expect(replayRes.validRecords.length).toBe(3); // Exactly the 3 uncommitted records
    await persister2.forceFlush();

    // Verify history contains all 8 events with no duplicates (idempotent eventId)
    const history = await repo.getTelemetryHistory(TEST_SITES.default.id, 'prototype1', 'channel1', undefined, undefined, 20);
    expect(history.length).toBe(8);

    // Replay the first sample again to test idempotency
    const idempotentBatchRes = await repo.insertTelemetryBatch([samples[0]!]);
    expect(idempotentBatchRes.inserted).toBe(0); // Duplicate eventId ignored

    spool2.close();
  });

  it('T09: Handles database unavailability at high rate without dropping spool records and recovers', async () => {
    const spool = new DurableSpoolManager({ spoolDir: tempDir });
    const repo = new MemoryTelemetryRepository();
    const persister = new TelemetryPersisterWorker(spool, repo, { batchIntervalMs: 50 });

    spool.open();

    // 1. Simulate DB outage
    repo.setHealthy(false);

    // 2. Ingest 100 samples during DB outage
    const samples = Array.from({ length: 100 }, (_, i) => createSamplePayload('prototype1', 'channel1', i + 1));
    for (const s of samples) {
      const res = spool.append(s);
      expect(res.ok).toBe(true);
      persister.onRecordAppended({ offset: res.offset, length: res.length, payload: s });
    }

    spool.flushSync();

    // Persister attempts commit but catches DB outage
    await persister.triggerCommit();
    expect(persister.getDbFailureCount()).toBeGreaterThan(0);
    expect(persister.getPendingCount()).toBe(100); // 100 records safely held in pending batch

    // 3. Database recovers
    repo.setHealthy(true);
    await persister.triggerCommit();

    // All 100 records committed once
    expect(persister.getPendingCount()).toBe(0);
    expect(persister.totalCommittedRecords).toBe(100);

    const history = await repo.getTelemetryHistory(TEST_SITES.default.id, 'prototype1', 'channel1', undefined, undefined, 200);
    expect(history.length).toBe(100);

    spool.close();
  });

  it('T10: Crash with truncated or corrupted final record is safely recovered and truncated', () => {
    const spool = new DurableSpoolManager({ spoolDir: tempDir });
    spool.open();

    // 1. Write 3 valid records
    for (let i = 1; i <= 3; i++) {
      const res = spool.append(createSamplePayload('prototype1', 'channel1', i));
      expect(res.ok).toBe(true);
    }
    spool.flushSync();
    const validOffsetBeforeCrash = spool.getCurrentOffset();

    // 2. Inject corrupted/truncated record at EOF (e.g. simulated power outage mid-write)
    const filePath = path.join(tempDir, 'telemetry.spool');
    const corruptBytes = Buffer.from([0x4d, 0x53, 0x50, 0x31, 0x00, 0x00, 0x05]); // Truncated header
    fs.appendFileSync(filePath, corruptBytes);

    // 3. Re-open spool and run recovery
    spool.close();

    const recoverSpool = new DurableSpoolManager({ spoolDir: tempDir });
    recoverSpool.open();

    const result = recoverSpool.recoverAndReplay(0);
    expect(result.validRecords.length).toBe(3);
    expect(result.corruptedTruncated).toBe(true);
    expect(result.lastValidOffset).toBe(validOffsetBeforeCrash);

    // Verify file was truncated back to valid offset
    const stats = fs.statSync(filePath);
    expect(stats.size).toBe(validOffsetBeforeCrash);

    recoverSpool.close();
  });

  it('T11: Enforces spool quota bound and increments drop counters without unbounded growth', () => {
    // Set spool quota to a tight 300 bytes limit
    const spool = new DurableSpoolManager({
      spoolDir: tempDir,
      maxSpoolSizeBytes: 300,
      maxQueueSize: 10,
    });
    spool.open();

    // First record will fit
    const res1 = spool.append(createSamplePayload('prototype1', 'channel1', 1));
    expect(res1.ok).toBe(true);

    // Second record exceeds quota bound
    const res2 = spool.append(createSamplePayload('prototype1', 'channel1', 2));
    expect(res2.ok).toBe(false);
    expect(res2.error).toBe('SPOOL_QUOTA_EXCEEDED');
    expect(spool.quotaExceeded).toBe(true);
    expect(spool.droppedCount).toBe(1);

    spool.close();
  });
});
