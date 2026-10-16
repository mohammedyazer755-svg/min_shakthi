import crypto from 'node:crypto';
import type {
  TelemetryPayload,
  UserRole,
  AlertRule,
  AlertRecord,
  AlertAcknowledgement,
  ChannelMappingItem,
  UserPreferences,
} from '@minsakthi/contracts';
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

export interface DbDevice {
  id: string;
  rawDeviceId: string;
  siteId: string;
  enabled: boolean;
  expectedIntervalMs: number;
  configVersion: number;
}

export interface DbChannel {
  rawChannelId: string;
  displaySlot: number | null;
  label: string;
  enabled: boolean;
}

export interface DbAuditLog {
  id: string;
  siteId: string;
  actorId: string;
  action: string;
  target: string;
  beforeJson: unknown;
  afterJson: unknown;
  at: string;
  requestId?: string;
}

export interface HistoryQueryResult {
  samples: TelemetryPayload[];
  total: number;
  cutoff: string;
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
    limit?: number,
    offset?: number,
    cutoff?: string
  ): Promise<TelemetryPayload[]>;

  queryTelemetryHistory(
    siteId: string,
    deviceId: string,
    options: {
      channelId?: string;
      from?: string;
      to?: string;
      limit?: number;
      offset?: number;
      cutoff?: string;
    }
  ): Promise<HistoryQueryResult>;

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

  // Device & Mapping (Optimistic Locking R15)
  getDevice(siteId: string, deviceId: string): Promise<DbDevice | null>;
  getDeviceChannels(siteId: string, deviceId: string): Promise<DbChannel[]>;
  updateDeviceMapping(
    siteId: string,
    deviceId: string,
    expectedConfigVersion: number,
    mappings: ChannelMappingItem[],
    actorId: string
  ): Promise<{ configVersion: number; channels: DbChannel[] }>;

  // User Preferences & Audit Log (R16)
  getUserPreferences(userId: string): Promise<UserPreferences>;
  updateUserPreferences(
    userId: string,
    prefs: Partial<Omit<UserPreferences, 'userId'>>
  ): Promise<UserPreferences>;
  addAuditLog(entry: Omit<DbAuditLog, 'id' | 'at'>): Promise<void>;
  getAuditLogs(siteId: string, limit?: number): Promise<DbAuditLog[]>;

  // Alerts & Rules (R14)
  getAlertRules(siteId: string, deviceId?: string): Promise<AlertRule[]>;
  saveAlertRule(rule: AlertRule, actorId: string): Promise<AlertRule>;
  deleteAlertRule(siteId: string, ruleId: string, actorId: string): Promise<boolean>;
  getAlerts(
    siteId: string,
    deviceId?: string,
    state?: 'open' | 'acknowledged' | 'resolved'
  ): Promise<AlertRecord[]>;
  saveAlert(alert: AlertRecord): Promise<void>;
  acknowledgeAlert(
    alertId: string,
    userId: string,
    displayName?: string,
    note?: string
  ): Promise<AlertRecord>;
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

  // Phase 5 stores
  private devices = new Map<string, DbDevice>();
  private deviceChannelsMap = new Map<string, Map<string, DbChannel>>(); // deviceId -> (rawChannelId -> DbChannel)
  private userPreferencesMap = new Map<string, UserPreferences>();
  private auditLogs: DbAuditLog[] = [];
  private alertRulesMap = new Map<string, AlertRule>();
  private alertsMap = new Map<string, AlertRecord>();
  private acknowledgementsMap = new Map<string, AlertAcknowledgement[]>(); // alertId -> AlertAcknowledgement[]

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

      this.userPreferencesMap.set(u.id, {
        userId: u.id,
        timezone: 'Asia/Kolkata',
        preferredDeviceId: 'prototype1',
        displayPreferences: { theme: 'warm_ivory', density: 'compact' },
        updatedAt: new Date().toISOString(),
      });
    }

    // Seed devices & site mappings
    for (const dev of Object.values(TEST_DEVICES)) {
      this.deviceSiteMap.set(dev.rawDeviceId, dev.siteId);
      this.deviceSiteMap.set(dev.id, dev.siteId);

      this.devices.set(dev.rawDeviceId, {
        id: dev.id,
        rawDeviceId: dev.rawDeviceId,
        siteId: dev.siteId,
        enabled: true,
        expectedIntervalMs: 5000,
        configVersion: 1,
      });

      const chanMap = new Map<string, DbChannel>();
      for (const ch of dev.channels) {
        chanMap.set(ch.rawChannelId, {
          rawChannelId: ch.rawChannelId,
          displaySlot: ch.slot,
          label: ch.label,
          enabled: true,
        });
      }
      this.deviceChannelsMap.set(dev.rawDeviceId, chanMap);
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
      const deviceSite = this.deviceSiteMap.get(r.deviceId);
      if (deviceSite && deviceSite !== r.siteId) {
        continue;
      }

      if (!this.samples.has(r.eventId)) {
        this.samples.set(r.eventId, { ...r, persistence: 'committed' });
        inserted += 1;
      }

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

    const deviceSite = this.deviceSiteMap.get(deviceId);
    if (deviceSite && deviceSite !== siteId) {
      return new Map();
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
    limit = 100,
    offset = 0,
    cutoff?: string
  ): Promise<TelemetryPayload[]> {
    const res = await this.queryTelemetryHistory(siteId, deviceId, {
      channelId,
      from,
      to,
      limit,
      offset,
      cutoff,
    });
    return res.samples;
  }

  public async queryTelemetryHistory(
    siteId: string,
    deviceId: string,
    options: {
      channelId?: string;
      from?: string;
      to?: string;
      limit?: number;
      offset?: number;
      cutoff?: string;
    }
  ): Promise<HistoryQueryResult> {
    if (!this.healthy) {
      throw new Error('DATABASE_UNAVAILABLE');
    }

    const deviceSite = this.deviceSiteMap.get(deviceId);
    if (deviceSite && deviceSite !== siteId) {
      return { samples: [], total: 0, cutoff: options.cutoff || new Date().toISOString() };
    }

    const fromTime = options.from ? new Date(options.from).getTime() : 0;
    const toTime = options.to ? new Date(options.to).getTime() : Number.MAX_SAFE_INTEGER;
    const cutoffTime = options.cutoff ? new Date(options.cutoff).getTime() : Date.now();
    const effectiveTo = Math.min(toTime, cutoffTime);
    const limit = options.limit ?? 100;
    const offset = options.offset ?? 0;

    const list: TelemetryPayload[] = [];
    for (const s of this.samples.values()) {
      if (s.deviceId === deviceId) {
        if (options.channelId && options.channelId !== 'all' && s.channelId !== options.channelId) {
          continue;
        }
        const t = new Date(s.receivedAt).getTime();
        if (t >= fromTime && t <= effectiveTo) {
          list.push(s);
        }
      }
    }

    list.sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime());

    return {
      samples: list.slice(offset, offset + limit),
      total: list.length,
      cutoff: options.cutoff || new Date(cutoffTime).toISOString(),
    };
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

  // Phase 5 Implementations
  public async getDevice(siteId: string, deviceId: string): Promise<DbDevice | null> {
    const dev = this.devices.get(deviceId);
    if (!dev || dev.siteId !== siteId) return null;
    return { ...dev };
  }

  public async getDeviceChannels(siteId: string, deviceId: string): Promise<DbChannel[]> {
    const dev = this.devices.get(deviceId);
    if (!dev || dev.siteId !== siteId) return [];
    const chMap = this.deviceChannelsMap.get(deviceId);
    if (!chMap) return [];
    return Array.from(chMap.values());
  }

  public async updateDeviceMapping(
    siteId: string,
    deviceId: string,
    expectedConfigVersion: number,
    mappings: ChannelMappingItem[],
    actorId: string
  ): Promise<{ configVersion: number; channels: DbChannel[] }> {
    const dev = this.devices.get(deviceId);
    if (!dev || dev.siteId !== siteId) {
      throw new Error('DEVICE_NOT_FOUND');
    }

    // Optimistic locking check (R15)
    if (dev.configVersion !== expectedConfigVersion) {
      throw new Error('OPTIMISTIC_LOCK_CONFLICT');
    }

    const beforeChannels = await this.getDeviceChannels(siteId, deviceId);
    const newChanMap = new Map<string, DbChannel>();

    for (const m of mappings) {
      newChanMap.set(m.channelId, {
        rawChannelId: m.channelId,
        displaySlot: m.displaySlot,
        label: m.label,
        enabled: m.enabled,
      });
    }

    this.deviceChannelsMap.set(deviceId, newChanMap);
    dev.configVersion += 1;

    // Audit log (R15)
    await this.addAuditLog({
      siteId,
      actorId,
      action: 'UPDATE_DEVICE_MAPPING',
      target: `device:${deviceId}`,
      beforeJson: beforeChannels,
      afterJson: Array.from(newChanMap.values()),
    });

    return {
      configVersion: dev.configVersion,
      channels: Array.from(newChanMap.values()),
    };
  }

  public async getUserPreferences(userId: string): Promise<UserPreferences> {
    const p = this.userPreferencesMap.get(userId);
    if (p) return { ...p };
    return {
      userId,
      timezone: 'Asia/Kolkata',
      preferredDeviceId: 'prototype1',
      displayPreferences: {},
    };
  }

  public async updateUserPreferences(
    userId: string,
    prefs: Partial<Omit<UserPreferences, 'userId'>>
  ): Promise<UserPreferences> {
    const current = await this.getUserPreferences(userId);
    const updated: UserPreferences = {
      ...current,
      ...prefs,
      userId,
      updatedAt: new Date().toISOString(),
    };
    this.userPreferencesMap.set(userId, updated);
    return { ...updated };
  }

  public async addAuditLog(entry: Omit<DbAuditLog, 'id' | 'at'>): Promise<void> {
    this.auditLogs.unshift({
      ...entry,
      id: crypto.randomUUID(),
      at: new Date().toISOString(),
    });
    // Keep bounded audit log in memory
    if (this.auditLogs.length > 500) {
      this.auditLogs = this.auditLogs.slice(0, 500);
    }
  }

  public async getAuditLogs(siteId: string, limit = 50): Promise<DbAuditLog[]> {
    return this.auditLogs.filter((a) => a.siteId === siteId).slice(0, limit);
  }

  public async getAlertRules(siteId: string, deviceId?: string): Promise<AlertRule[]> {
    let list = Array.from(this.alertRulesMap.values()).filter((r) => r.siteId === siteId);
    if (deviceId) {
      list = list.filter((r) => r.deviceId === deviceId);
    }
    return list;
  }

  public async saveAlertRule(rule: AlertRule, actorId: string): Promise<AlertRule> {
    const existing = this.alertRulesMap.get(rule.id);
    const updated = {
      ...rule,
      version: (rule.version || 1) + (existing ? 1 : 0),
      updatedAt: new Date().toISOString(),
    };
    this.alertRulesMap.set(rule.id, updated);

    await this.addAuditLog({
      siteId: rule.siteId,
      actorId,
      action: existing ? 'UPDATE_ALERT_RULE' : 'CREATE_ALERT_RULE',
      target: `rule:${rule.id}`,
      beforeJson: existing ?? null,
      afterJson: updated,
    });

    return updated;
  }

  public async deleteAlertRule(siteId: string, ruleId: string, actorId: string): Promise<boolean> {
    const existing = this.alertRulesMap.get(ruleId);
    if (!existing || existing.siteId !== siteId) return false;

    this.alertRulesMap.delete(ruleId);
    await this.addAuditLog({
      siteId,
      actorId,
      action: 'DELETE_ALERT_RULE',
      target: `rule:${ruleId}`,
      beforeJson: existing,
      afterJson: null,
    });
    return true;
  }

  public async getAlerts(
    siteId: string,
    deviceId?: string,
    state?: 'open' | 'acknowledged' | 'resolved'
  ): Promise<AlertRecord[]> {
    let list = Array.from(this.alertsMap.values()).filter((a) => {
      const rule = this.alertRulesMap.get(a.ruleId);
      return !rule || rule.siteId === siteId;
    });
    if (deviceId) {
      list = list.filter((a) => a.deviceId === deviceId);
    }
    if (state) {
      list = list.filter((a) => a.state === state);
    }
    return list.map((a) => ({
      ...a,
      rule: this.alertRulesMap.get(a.ruleId),
      acknowledgements: this.acknowledgementsMap.get(a.id) || [],
    }));
  }

  public async saveAlert(alert: AlertRecord): Promise<void> {
    this.alertsMap.set(alert.id, alert);
  }

  public async acknowledgeAlert(
    alertId: string,
    userId: string,
    displayName?: string,
    note?: string
  ): Promise<AlertRecord> {
    const alert = this.alertsMap.get(alertId);
    if (!alert) {
      throw new Error('ALERT_NOT_FOUND');
    }

    const acks = this.acknowledgementsMap.get(alertId) || [];
    const existingIdx = acks.findIndex((a) => a.userId === userId);

    const ack: AlertAcknowledgement = {
      id: crypto.randomUUID(),
      alertId,
      userId,
      userDisplayName: displayName,
      ackAt: new Date().toISOString(),
      note: note || null,
    };

    if (existingIdx >= 0) {
      acks[existingIdx] = ack;
    } else {
      acks.push(ack);
    }
    this.acknowledgementsMap.set(alertId, acks);

    if (alert.state === 'open') {
      alert.state = 'acknowledged';
    }

    return {
      ...alert,
      rule: this.alertRulesMap.get(alert.ruleId),
      acknowledgements: acks,
    };
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
