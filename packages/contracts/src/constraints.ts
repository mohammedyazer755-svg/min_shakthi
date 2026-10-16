/**
 * Provisional Capacity, Retention, and Operating Constraints
 * Recorded as contractual bounds per PRD, Architecture, and Data Model specifications.
 */

export const SYSTEM_CONSTRAINTS = {
  /**
   * Capacity and Workload Envelope
   */
  capacity: {
    maxDevices: 10,
    channelsPerDevice: 5,
    messageRatePerChannelHz: 1,
    maxPacketsPerSecond: 50,
    concurrentForegroundClients: 20,
    maxPayloadBytes: 1024,
    maxIdLengthChars: 64,
  },

  /**
   * Latency Service Level Objectives (Warm network, RTT <= 150ms)
   */
  latencySlo: {
    ingestToCacheP95Ms: 50,
    serverReceiptToDisplayP95Ms: 1000,
    serverReceiptToDisplayP99Ms: 2000,
    authenticatedSnapshotP95Ms: 1000,
    firstAcceptedPacketVisibleMaxMs: 2000,
  },

  /**
   * Freshness and Transport State Machine Thresholds
   */
  freshness: {
    provisionalIntervalMs: 5000, // 5s until confirmed by hardware owner (Q01)
    calculateStaleMs: (intervalMs: number) => Math.max(3 * intervalMs, 5000),
    calculateOfflineMs: (intervalMs: number) => Math.max(10 * intervalMs, 30000),
    stateTransitionResolutionMs: 1000,
    statusHeartbeatIntervalMs: 5000,
    statusHeartbeatExpiryMs: 15000,
  },

  /**
   * Storage and Ingest Durability Bounds
   */
  storage: {
    maxRamQueueRecords: 10000,
    maxSpoolBytes: 1073741824, // 1 GiB
    spoolQuotaAlertPercent: 80,
    fsyncBatchTimeoutMs: 100,
    fsyncBatchMaxRecords: 100,
    dbBatchTimeoutMs: 250,
    dbBatchMaxRecords: 100,
  },

  /**
   * Retention Periods (Provisional until company sign-off)
   */
  retention: {
    rawTelemetryDays: 30, // ~129.6M rows at 50 packets/s
    minuteRollupsMonths: 13,
    reportsAndAuditMonths: 24,
    malformedQuarantineDays: 7,
  },

  /**
   * Query & Display Limits
   */
  queryLimits: {
    maxRawHistoryWindowHours: 24,
    maxHistoryPointsPerSeries: 2000,
    defaultCursorLimit: 500,
    maxExportRows: 100000,
    maxRealtimeDisplayRows: 200,
    maxChartVisiblePoints: 600,
  },

  /**
   * Billing and Metrology Gates
   */
  metrology: {
    billingEnabled: false, // Strict contract: Disabled until Q03/Q09 confirmed
    allowSyntheticFallbacks: false,
    maxScalarMagnitude: 1e12,
  },
} as const;
