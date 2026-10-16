import fs from 'node:fs';
import path from 'node:path';
import type { TelemetryPayload } from '@minsakthi/contracts';

const SPOOL_MAGIC = 0x4d535031; // 'MSP1' in hex

// Standard IEEE 802.3 CRC32 lookup table
const CRC32_TABLE = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let j = 0; j < 8; j++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  CRC32_TABLE[i] = c;
}

export function computeCrc32(buf: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    const val = buf[i] ?? 0;
    const tableIdx = (crc ^ val) & 0xff;
    const tableVal = CRC32_TABLE[tableIdx] ?? 0;
    crc = (crc >>> 8) ^ tableVal;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

export interface SpoolRecord {
  offset: number;
  length: number;
  payload: TelemetryPayload;
}

export interface SpoolOptions {
  spoolDir: string;
  spoolFileName?: string;
  maxSpoolSizeBytes?: number; // Default 1 GiB (1024 * 1024 * 1024)
  maxQueueSize?: number; // Default 10,000
  fsyncIntervalMs?: number; // Default 100ms
  fsyncBatchRecords?: number; // Default 100 records
}

export class DurableSpoolManager {
  private filePath: string;
  private fd: number | null = null;
  private currentOffset = 0;
  private committedOffset = 0;
  private pendingFsyncRecords = 0;
  private fsyncTimer: NodeJS.Timeout | null = null;
  private readonly maxSpoolSizeBytes: number;
  private readonly maxQueueSize: number;
  private readonly fsyncIntervalMs: number;
  private readonly fsyncBatchRecords: number;

  public droppedCount = 0;
  public totalAppendedCount = 0;
  public fsyncCount = 0;
  public quotaExceeded = false;

  constructor(options: SpoolOptions) {
    if (!fs.existsSync(options.spoolDir)) {
      fs.mkdirSync(options.spoolDir, { recursive: true });
    }
    const fileName = options.spoolFileName || 'telemetry.spool';
    this.filePath = path.join(options.spoolDir, fileName);
    this.maxSpoolSizeBytes = options.maxSpoolSizeBytes ?? 1024 * 1024 * 1024;
    this.maxQueueSize = options.maxQueueSize ?? 10000;
    this.fsyncIntervalMs = options.fsyncIntervalMs ?? 100;
    this.fsyncBatchRecords = options.fsyncBatchRecords ?? 100;
  }

  public open(): void {
    if (this.fd !== null) return;
    this.fd = fs.openSync(this.filePath, 'a+');
    const stats = fs.fstatSync(this.fd);
    this.currentOffset = stats.size;
  }

  public close(): void {
    if (this.fsyncTimer) {
      clearInterval(this.fsyncTimer);
      this.fsyncTimer = null;
    }
    this.flushSync();
    if (this.fd !== null) {
      fs.closeSync(this.fd);
      this.fd = null;
    }
  }

  public append(payload: TelemetryPayload): { ok: boolean; offset: number; length: number; error?: string } {
    if (this.fd === null) {
      this.open();
    }

    // Check quota and queue size bounds (R10, T11)
    if (this.currentOffset >= this.maxSpoolSizeBytes) {
      this.quotaExceeded = true;
      this.droppedCount += 1;
      return { ok: false, offset: this.currentOffset, length: 0, error: 'SPOOL_QUOTA_EXCEEDED' };
    }

    if (this.pendingFsyncRecords >= this.maxQueueSize) {
      this.droppedCount += 1;
      return { ok: false, offset: this.currentOffset, length: 0, error: 'SPOOL_QUEUE_SATURATED' };
    }

    const jsonStr = JSON.stringify(payload);
    const payloadBytes = Buffer.from(jsonStr, 'utf-8');
    const crc = computeCrc32(payloadBytes);

    // Frame: Magic (4 bytes) + Length (4 bytes) + CRC (4 bytes) + Payload
    const frame = Buffer.alloc(12 + payloadBytes.length);
    frame.writeUInt32BE(SPOOL_MAGIC, 0);
    frame.writeUInt32BE(payloadBytes.length, 4);
    frame.writeUInt32BE(crc, 8);
    payloadBytes.copy(frame, 12);

    const recordOffset = this.currentOffset;
    fs.writeSync(this.fd!, frame, 0, frame.length, recordOffset);
    this.currentOffset += frame.length;
    this.totalAppendedCount += 1;
    this.pendingFsyncRecords += 1;

    // Trigger or schedule fsync
    if (this.pendingFsyncRecords >= this.fsyncBatchRecords) {
      this.flushSync();
    } else if (!this.fsyncTimer) {
      this.fsyncTimer = setTimeout(() => {
        this.flushSync();
      }, this.fsyncIntervalMs);
    }

    return { ok: true, offset: recordOffset, length: frame.length };
  }

  public flushSync(): void {
    if (this.fsyncTimer) {
      clearTimeout(this.fsyncTimer);
      this.fsyncTimer = null;
    }
    if (this.fd !== null && this.pendingFsyncRecords > 0) {
      fs.fsyncSync(this.fd);
      this.fsyncCount += 1;
      this.pendingFsyncRecords = 0;
    }
  }

  public getCommittedOffset(): number {
    return this.committedOffset;
  }

  public setCommittedOffset(offset: number): void {
    this.committedOffset = offset;
  }

  public getCurrentOffset(): number {
    return this.currentOffset;
  }

  public getPendingUncommittedBytes(): number {
    return Math.max(0, this.currentOffset - this.committedOffset);
  }

  /**
   * Replays records starting from startOffset up to EOF.
   * If an incomplete or corrupt record is encountered at the end, it safely truncates the file back to last valid offset (T10).
   */
  public recoverAndReplay(
    startOffset = 0,
    onRecord?: (record: SpoolRecord) => Promise<void> | void
  ): { validRecords: SpoolRecord[]; lastValidOffset: number; corruptedTruncated: boolean } {
    if (this.fd === null) {
      this.open();
    }
    this.flushSync();

    const stats = fs.fstatSync(this.fd!);
    const fileSize = stats.size;
    let offset = startOffset;
    const validRecords: SpoolRecord[] = [];
    let corruptedTruncated = false;

    const readBuf = Buffer.alloc(12);

    while (offset < fileSize) {
      const remaining = fileSize - offset;
      if (remaining < 12) {
        // Incomplete header at end of file - truncated crash
        corruptedTruncated = true;
        break;
      }

      const bytesRead = fs.readSync(this.fd!, readBuf, 0, 12, offset);
      if (bytesRead < 12) {
        corruptedTruncated = true;
        break;
      }

      const magic = readBuf.readUInt32BE(0);
      const length = readBuf.readUInt32BE(4);
      const expectedCrc = readBuf.readUInt32BE(8);

      if (magic !== SPOOL_MAGIC) {
        // Corrupted header
        corruptedTruncated = true;
        break;
      }

      if (offset + 12 + length > fileSize) {
        // Record payload truncated
        corruptedTruncated = true;
        break;
      }

      const payloadBuf = Buffer.alloc(length);
      const pBytesRead = fs.readSync(this.fd!, payloadBuf, 0, length, offset + 12);
      if (pBytesRead < length) {
        corruptedTruncated = true;
        break;
      }

      const actualCrc = computeCrc32(payloadBuf);
      if (actualCrc !== expectedCrc) {
        // Corrupted payload checksum mismatch
        corruptedTruncated = true;
        break;
      }

      let payload: TelemetryPayload;
      try {
        payload = JSON.parse(payloadBuf.toString('utf-8'));
      } catch {
        corruptedTruncated = true;
        break;
      }

      const record: SpoolRecord = {
        offset,
        length: 12 + length,
        payload,
      };

      validRecords.push(record);
      if (onRecord) {
        onRecord(record);
      }

      offset += 12 + length;
    }

    if (corruptedTruncated) {
      console.warn(
        `[SPOOL RECOVERY] Truncated or corrupt record detected at offset ${offset}. Truncating file to ${offset} bytes.`
      );
      if (this.fd !== null) {
        fs.closeSync(this.fd);
        this.fd = null;
      }
      fs.truncateSync(this.filePath, offset);
      this.fd = fs.openSync(this.filePath, 'a+');
      this.currentOffset = offset;
    }

    return {
      validRecords,
      lastValidOffset: offset,
      corruptedTruncated,
    };
  }
}
