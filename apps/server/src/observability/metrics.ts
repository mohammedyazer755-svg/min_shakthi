/**
 * Structured Ingestion Metrics and Sanitized Diagnostics
 */

export interface BoundedDiagnosticError {
  timestamp: string;
  code: string;
  reason: string;
  topic: string;
  sourceSnippet: string;
}

export class IngestMetrics {
  private static instance: IngestMetrics;

  public totalReceived = 0;
  public totalAccepted = 0;
  public totalRejected = 0;
  public totalQuarantined = 0;
  public reconnectAttempts = 0;
  public subackSuccessCount = 0;
  public subackFailureCount = 0;

  public brokerConnected = false;
  public brokerSubscribed = false;
  public lastReceiptTimestamp: string | null = null;
  public lastIngressToCacheMs = 0;
  public ingressLatenciesMs: number[] = [];

  public errorsByReason: Record<string, number> = {};
  public recentErrors: BoundedDiagnosticError[] = [];
  private readonly maxRecentErrors = 50;
  private readonly maxLatencySamples = 1000;

  private constructor() {}

  public static getInstance(): IngestMetrics {
    if (!IngestMetrics.instance) {
      IngestMetrics.instance = new IngestMetrics();
    }
    return IngestMetrics.instance;
  }

  public recordReceived(): void {
    this.totalReceived += 1;
    this.lastReceiptTimestamp = new Date().toISOString();
  }

  public recordAccepted(latencyMs: number): void {
    this.totalAccepted += 1;
    this.lastIngressToCacheMs = latencyMs;
    this.ingressLatenciesMs.push(latencyMs);
    if (this.ingressLatenciesMs.length > this.maxLatencySamples) {
      this.ingressLatenciesMs.shift();
    }
  }

  public recordRejected(code: string, reason: string, topic: string, rawPayload: string): void {
    this.totalRejected += 1;
    this.errorsByReason[code] = (this.errorsByReason[code] ?? 0) + 1;

    // Sanitize payload snippet: cap at 64 chars, no credentials
    const sanitizedSnippet = rawPayload.slice(0, 64).replace(/[\r\n]/g, ' ');

    this.recentErrors.unshift({
      timestamp: new Date().toISOString(),
      code,
      reason,
      topic,
      sourceSnippet: sanitizedSnippet,
    });

    if (this.recentErrors.length > this.maxRecentErrors) {
      this.recentErrors.pop();
    }
  }

  public recordQuarantined(reason: string): void {
    this.totalQuarantined += 1;
    this.errorsByReason[reason] = (this.errorsByReason[reason] ?? 0) + 1;
  }

  public getPercentileLatency(p: number): number {
    if (this.ingressLatenciesMs.length === 0) return 0;
    const sorted = [...this.ingressLatenciesMs].sort((a, b) => a - b);
    const index = Math.min(
      Math.floor((p / 100) * sorted.length),
      sorted.length - 1
    );
    return sorted[index] ?? 0;
  }

  public getSanitizedSnapshot(): Record<string, unknown> {
    return {
      broker: {
        connected: this.brokerConnected,
        subscribed: this.brokerSubscribed,
        reconnectAttempts: this.reconnectAttempts,
        subackSuccess: this.subackSuccessCount,
        subackFailure: this.subackFailureCount,
      },
      counts: {
        totalReceived: this.totalReceived,
        totalAccepted: this.totalAccepted,
        totalRejected: this.totalRejected,
        totalQuarantined: this.totalQuarantined,
      },
      timing: {
        lastReceiptTimestamp: this.lastReceiptTimestamp,
        lastIngressToCacheMs: this.lastIngressToCacheMs,
        p50IngressToCacheMs: this.getPercentileLatency(50),
        p95IngressToCacheMs: this.getPercentileLatency(95),
        sampleCount: this.ingressLatenciesMs.length,
      },
      errorsByReason: { ...this.errorsByReason },
      recentErrors: [...this.recentErrors],
    };
  }

  public reset(): void {
    this.totalReceived = 0;
    this.totalAccepted = 0;
    this.totalRejected = 0;
    this.totalQuarantined = 0;
    this.reconnectAttempts = 0;
    this.subackSuccessCount = 0;
    this.subackFailureCount = 0;
    this.brokerConnected = false;
    this.brokerSubscribed = false;
    this.lastReceiptTimestamp = null;
    this.lastIngressToCacheMs = 0;
    this.ingressLatenciesMs = [];
    this.errorsByReason = {};
    this.recentErrors = [];
  }
}
