import crypto from 'node:crypto';
import type { TelemetryPayload, UserRole } from '@minsakthi/contracts';
import {
  TEST_USERS,
  TEST_DEVICES,
  hashPassword,
  TEST_PASSWORD,
} from '@minsakthi/db';

export interface DbUser {
  id: string;
  email: string;
  passwordHash: string;
  displayName: string;
  disabledAt: Date | null;
}

export interface DbSession {
  id: string;
  userId: string;
  accessTokenHash: string;
  refreshFamilyId: string;
  refreshHash: string;
  expiresAt: Date;
  refreshExpiresAt: Date;
  revokedAt: Date | null;
}

export interface ITelemetryRepository {
  isHealthy(): boolean;
  setHealthy(healthy: boolean): void;

  // Telemetry & Snapshot
  insertTelemetryBatch(
    records: TelemetryPayload[],
    checkpoint?: { offset: number; eventId?: string }
  ): Promise<{ inserted: number }>;

  getLatestTelemetry(
    siteId: string,
    deviceId: string
  ): Promise<Map<string, TelemetryPayload>>;

  getTelemetryHistory(
    siteId: string,
    deviceId: string,
    channelId: string,
    from?: string,
    to?: string,
    limit?: number
  ): Promise<TelemetryPayload[]>;

  // Authentication & Authorization
  getUserByEmail(email: string): Promise<DbUser | null>;
  getUserById(id: string): Promise<DbUser | null>;
  getUserSiteRole(userId: string, siteId: string): Promise<UserRole | null>;
  getUserDefaultSite(userId: string): Promise<{ siteId: string; role: UserRole } | null>;

  createSession(params: {
    userId: string;
    accessTokenHash: string;
    refreshFamilyId: string;
    refreshHash: string;
    expiresAt: Date;
    refreshExpiresAt: Date;
  }): Promise<DbSession>;

  getSessionByAccessTokenHash(tokenHash: string): Promise<DbSession | null>;
  getSessionByRefreshHash(refreshHash: string): Promise<DbSession | null>;
  rotateSession(params: {
    oldSessionId: string;
    newAccessTokenHash: string;
    refreshFamilyId: string;
    newRefreshHash: string;
    expiresAt: Date;
    refreshExpiresAt: Date;
  }): Promise<DbSession>;
  revokeSessionFamily(refreshFamilyId: string): Promise<void>;
  getCheckpoint(consumerId: string): Promise<{ offset: number; eventId: string | null } | null>;
}

export class MemoryTelemetryRepository implements ITelemetryRepository {
  private healthy = true;
  private users = new Map<string, DbUser>();
  private userMemberships = new Map<string, Map<string, UserRole>>(); // userId -> (siteId -> role)
  private sessions = new Map<string, DbSession>();
  private samples = new Map<string, TelemetryPayload>(); // eventId -> sample
  private latest = new Map<string, TelemetryPayload>(); // composite: `${deviceId}:${channelId}` -> sample
  private deviceSiteMap = new Map<string, string>(); // deviceId -> siteId
  private checkpoints = new Map<string, { offset: number; eventId: string | null }>();

  constructor() {
    this.seedDefaults();
  }

  private seedDefaults(): void {
    // Seed test users
    const defaultHash = hashPassword(TEST_PASSWORD);
    for (const u of Object.values(TEST_USERS)) {
      this.users.set(u.email.toLowerCase(), {
        id: u.id,
        email: u.email.toLowerCase(),
        passwordHash: defaultHash,
        displayName: u.displayName,
        disabledAt: null,
      });

      if (!this.userMemberships.has(u.id)) {
        this.userMemberships.set(u.id, new Map());
      }
      this.userMemberships.get(u.id)!.set(u.siteId, u.role);
    }

    // Seed devices & site mappings
    for (const dev of Object.values(TEST_DEVICES)) {
      this.deviceSiteMap.set(dev.rawDeviceId, dev.siteId);
      this.deviceSiteMap.set(dev.id, dev.siteId);
    }
  }

  public isHealthy(): boolean {
    return this.healthy;
  }

  public setHealthy(healthy: boolean): void {
    this.healthy = healthy;
  }

  public async insertTelemetryBatch(
    records: TelemetryPayload[],
    checkpoint?: { offset: number; eventId?: string }
  ): Promise<{ inserted: number }> {
    if (!this.healthy) {
      throw new Error('DATABASE_UNAVAILABLE');
    }

    let inserted = 0;
    for (const r of records) {
      // Validate device belongs to site
      const deviceSite = this.deviceSiteMap.get(r.deviceId);
      if (deviceSite && deviceSite !== r.siteId) {
        continue; // Cross-site corruption prevented
      }

      // Idempotent insertion by eventId
      if (!this.samples.has(r.eventId)) {
        this.samples.set(r.eventId, { ...r, persistence: 'committed' });
        inserted += 1;
      }

      // Upsert latest by deviceId:channelId
      const key = `${r.deviceId}:${r.channelId}`;
      const existing = this.latest.get(key);
      if (!existing || new Date(r.receivedAt).getTime() >= new Date(existing.receivedAt).getTime()) {
        this.latest.set(key, { ...r, persistence: 'committed' });
      }
    }

    if (checkpoint) {
      this.checkpoints.set('telemetry_persister', {
        offset: checkpoint.offset,
        eventId: checkpoint.eventId ?? null,
      });
    }

    return { inserted };
  }

  public async getLatestTelemetry(
    siteId: string,
    deviceId: string
  ): Promise<Map<string, TelemetryPayload>> {
    if (!this.healthy) {
      throw new Error('DATABASE_UNAVAILABLE');
    }

    // Site isolation check (T16)
    const deviceSite = this.deviceSiteMap.get(deviceId);
    if (deviceSite && deviceSite !== siteId) {
      return new Map(); // Denied cross-site access
    }

    const result = new Map<string, TelemetryPayload>();
    for (const [key, payload] of this.latest.entries()) {
      if (key.startsWith(`${deviceId}:`)) {
        const channelId = key.slice(deviceId.length + 1);
        result.set(channelId, payload);
      }
    }
    return result;
  }

  public async getTelemetryHistory(
    siteId: string,
    deviceId: string,
    channelId: string,
    from?: string,
    to?: string,
    limit = 100
  ): Promise<TelemetryPayload[]> {
    if (!this.healthy) {
      throw new Error('DATABASE_UNAVAILABLE');
    }

    // Site isolation check
    const deviceSite = this.deviceSiteMap.get(deviceId);
    if (deviceSite && deviceSite !== siteId) {
      return [];
    }

    const fromTime = from ? new Date(from).getTime() : 0;
    const toTime = to ? new Date(to).getTime() : Number.MAX_SAFE_INTEGER;

    const list: TelemetryPayload[] = [];
    for (const s of this.samples.values()) {
      if (s.deviceId === deviceId && s.channelId === channelId) {
        const t = new Date(s.receivedAt).getTime();
        if (t >= fromTime && t <= toTime) {
          list.push(s);
        }
      }
    }

    return list
      .sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime())
      .slice(0, limit);
  }

  public async getUserByEmail(email: string): Promise<DbUser | null> {
    return this.users.get(email.toLowerCase().trim()) ?? null;
  }

  public async getUserById(id: string): Promise<DbUser | null> {
    for (const u of this.users.values()) {
      if (u.id === id) return u;
    }
    return null;
  }


  public async getUserSiteRole(userId: string, siteId: string): Promise<UserRole | null> {
    return this.userMemberships.get(userId)?.get(siteId) ?? null;
  }

  public async getUserDefaultSite(
    userId: string
  ): Promise<{ siteId: string; role: UserRole } | null> {
    const mems = this.userMemberships.get(userId);
    if (!mems || mems.size === 0) return null;
    const [siteId, role] = Array.from(mems.entries())[0]!;
    return { siteId, role };
  }

  public async createSession(params: {
    userId: string;
    accessTokenHash: string;
    refreshFamilyId: string;
    refreshHash: string;
    expiresAt: Date;
    refreshExpiresAt: Date;
  }): Promise<DbSession> {
    const session: DbSession = {
      id: crypto.randomUUID(),
      userId: params.userId,
      accessTokenHash: params.accessTokenHash,
      refreshFamilyId: params.refreshFamilyId,
      refreshHash: params.refreshHash,
      expiresAt: params.expiresAt,
      refreshExpiresAt: params.refreshExpiresAt,
      revokedAt: null,
    };
    this.sessions.set(session.id, session);
    return session;
  }

  public async getSessionByAccessTokenHash(tokenHash: string): Promise<DbSession | null> {
    for (const s of this.sessions.values()) {
      if (s.accessTokenHash === tokenHash && !s.revokedAt) {
        return s;
      }
    }
    return null;
  }

  public async getSessionByRefreshHash(refreshHash: string): Promise<DbSession | null> {
    for (const s of this.sessions.values()) {
      if (s.refreshHash === refreshHash) {
        return s;
      }
    }
    return null;
  }

  public async rotateSession(params: {
    oldSessionId: string;
    newAccessTokenHash: string;
    refreshFamilyId: string;
    newRefreshHash: string;
    expiresAt: Date;
    refreshExpiresAt: Date;
  }): Promise<DbSession> {
    const oldSession = this.sessions.get(params.oldSessionId);
    if (oldSession) {
      oldSession.revokedAt = new Date();
    }

    const newSession: DbSession = {
      id: crypto.randomUUID(),
      userId: oldSession ? oldSession.userId : '',
      accessTokenHash: params.newAccessTokenHash,
      refreshFamilyId: params.refreshFamilyId,
      refreshHash: params.newRefreshHash,
      expiresAt: params.expiresAt,
      refreshExpiresAt: params.refreshExpiresAt,
      revokedAt: null,
    };
    this.sessions.set(newSession.id, newSession);
    return newSession;
  }

  public async revokeSessionFamily(refreshFamilyId: string): Promise<void> {
    const now = new Date();
    for (const s of this.sessions.values()) {
      if (s.refreshFamilyId === refreshFamilyId) {
        s.revokedAt = now;
      }
    }
  }

  public async getCheckpoint(
    consumerId: string
  ): Promise<{ offset: number; eventId: string | null } | null> {
    return this.checkpoints.get(consumerId) ?? null;
  }
}

// Singleton repository holder
let globalRepo: ITelemetryRepository | null = null;

export function getTelemetryRepository(): ITelemetryRepository {
  if (!globalRepo) {
    globalRepo = new MemoryTelemetryRepository();
  }
  return globalRepo;
}

export function setTelemetryRepository(repo: ITelemetryRepository): void {
  globalRepo = repo;
}
