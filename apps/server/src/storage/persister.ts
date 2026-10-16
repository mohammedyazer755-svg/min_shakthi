import { DurableSpoolManager, type SpoolRecord } from './spool.js';
import { type ITelemetryRepository, getTelemetryRepository } from './db.js';

export interface PersisterOptions {
  batchIntervalMs?: number; // Default 250ms
  batchMaxRecords?: number; // Default 100 records
}

export class TelemetryPersisterWorker {
  private timer: NodeJS.Timeout | null = null;
  private pendingBatch: SpoolRecord[] = [];
  private isCommitting = false;
  private readonly batchIntervalMs: number;
  private readonly batchMaxRecords: number;
  private lastCommitTime = Date.now();
  private dbFailureCount = 0;

  public totalCommittedRecords = 0;
  public lastPersistenceLagMs = 0;

  constructor(
    private readonly spool: DurableSpoolManager,
    private readonly repo: ITelemetryRepository = getTelemetryRepository(),
    options: PersisterOptions = {}
  ) {
    this.batchIntervalMs = options.batchIntervalMs ?? 250;
    this.batchMaxRecords = options.batchMaxRecords ?? 100;
  }

  public start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => {
      this.triggerCommit();
    }, this.batchIntervalMs);
  }

  public stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  public onRecordAppended(record: SpoolRecord): void {
    this.pendingBatch.push(record);
    if (this.pendingBatch.length >= this.batchMaxRecords) {
      this.triggerCommit();
    }
  }

  public async triggerCommit(): Promise<void> {
    if (this.isCommitting || this.pendingBatch.length === 0) {
      return;
    }

    this.isCommitting = true;
    const batchToCommit = [...this.pendingBatch];
    const latestRecord = batchToCommit[batchToCommit.length - 1];

    try {
      const payloads = batchToCommit.map((r) => r.payload);
      const checkpointOffset = latestRecord ? latestRecord.offset + latestRecord.length : this.spool.getCommittedOffset();
      const checkpointEventId = latestRecord?.payload.eventId;

      await this.repo.insertTelemetryBatch(payloads, {
        offset: checkpointOffset,
        eventId: checkpointEventId,
      });

      // Advance spool checkpoint
      this.spool.setCommittedOffset(checkpointOffset);

      // Successfully committed: remove processed records from pending batch
      this.pendingBatch.splice(0, batchToCommit.length);
      this.totalCommittedRecords += batchToCommit.length;
      this.dbFailureCount = 0;

      const now = Date.now();
      this.lastPersistenceLagMs = now - this.lastCommitTime;
      this.lastCommitTime = now;
    } catch (err) {
      this.dbFailureCount += 1;
      // Database unavailable (T09): keep pendingBatch, do not advance checkpoint
      this.lastPersistenceLagMs = Date.now() - this.lastCommitTime;
      console.warn(
        `[PERSISTER] Database commit deferred (failure #${this.dbFailureCount}). Spool lag: ${this.lastPersistenceLagMs}ms:`,
        (err as Error).message
      );
    } finally {
      this.isCommitting = false;
    }
  }

  public async forceFlush(): Promise<void> {
    await this.triggerCommit();
  }

  public getPendingCount(): number {
    return this.pendingBatch.length;
  }

  public getDbFailureCount(): number {
    return this.dbFailureCount;
  }
}
