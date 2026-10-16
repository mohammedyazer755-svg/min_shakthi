import crypto from 'node:crypto';
import pg, { type PoolClient, type QueryResultRow } from 'pg';
import { attachDatabasePool } from '@vercel/functions';
import type {
  AlertAcknowledgement, AlertRecord, AlertRule, ChannelMappingItem,
  TelemetryPayload, UserPreferences, UserRole,
} from '@minsakthi/contracts';
import type {
  DbAuditLog, DbChannel, DbDevice, DbSession, DbUser,
  HistoryQueryResult, ITelemetryRepository,
} from './db.js';

const sessionColumns = `id, user_id AS "userId", access_token_hash AS "accessTokenHash",
  refresh_family_id AS "refreshFamilyId", refresh_hash AS "refreshHash",
  expires_at AS "expiresAt", refresh_expires_at AS "refreshExpiresAt", revoked_at AS "revokedAt"`;

export interface WorkerStatus {
  at: string;
  epoch: string;
  connected: boolean;
  subscribed: boolean;
  received: number;
  accepted: number;
  quarantined: number;
}

/** The API and the MQTT daemon use the same durable database, never test defaults. */
export class PostgresTelemetryRepository implements ITelemetryRepository {
  readonly pool: pg.Pool;
  private healthy = true;

  constructor(connectionString: string) {
    this.pool = new pg.Pool({ connectionString, max: 5, idleTimeoutMillis: 10000, connectionTimeoutMillis: 10000 });
    if (process.env['VERCEL']) attachDatabasePool(this.pool);
    this.pool.on('error', () => { this.healthy = false; });
  }

  isHealthy(): boolean { return this.healthy; }
  setHealthy(healthy: boolean): void { this.healthy = healthy; }

  private async query<T extends QueryResultRow>(sql: string, values: unknown[] = []) {
    try {
      const result = await this.pool.query<T>(sql, values);
      this.healthy = true;
      return result;
    } catch {
      this.healthy = false;
      throw new Error('DATABASE_UNAVAILABLE');
    }
  }

  private async transaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await work(client);
      await client.query('COMMIT');
      this.healthy = true;
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally { client.release(); }
  }

  async ping(): Promise<void> { await this.query('SELECT 1'); }
  async close(): Promise<void> { await this.pool.end(); }
  async getDevicePacketCount(siteId: string,deviceId: string): Promise<number> {
    const { rows }=await this.query<{ total:string }>('SELECT COUNT(*) AS total FROM runtime_telemetry WHERE site_id=$1 AND device_id=$2',[siteId,deviceId]);
    return Number(rows[0]?.total ?? 0);
  }

  async getUserByEmail(email: string): Promise<DbUser | null> {
    const { rows } = await this.query<DbUser>(`SELECT id, normalized_email AS email,
      password_hash AS "passwordHash", display_name AS "displayName", disabled_at AS "disabledAt"
      FROM users WHERE normalized_email=$1`, [email.trim().toLowerCase()]);
    return rows[0] ?? null;
  }
  async getUserById(id: string): Promise<DbUser | null> {
    const { rows } = await this.query<DbUser>(`SELECT id, normalized_email AS email,
      password_hash AS "passwordHash", display_name AS "displayName", disabled_at AS "disabledAt"
      FROM users WHERE id=$1`, [id]);
    return rows[0] ?? null;
  }
  async getUserSiteRole(userId: string, siteId: string): Promise<UserRole | null> {
    const { rows } = await this.query<{ role: UserRole }>('SELECT role FROM memberships WHERE user_id=$1 AND site_id=$2', [userId, siteId]);
    return rows[0]?.role ?? null;
  }
  async getUserDefaultSite(userId: string): Promise<{ siteId: string; role: UserRole } | null> {
    const { rows } = await this.query<{ siteId: string; role: UserRole }>('SELECT site_id AS "siteId", role FROM memberships WHERE user_id=$1 ORDER BY created_at, site_id LIMIT 1', [userId]);
    return rows[0] ?? null;
  }
  async createSession(p: Parameters<ITelemetryRepository['createSession']>[0]): Promise<DbSession> {
    const { rows } = await this.query<DbSession>(`INSERT INTO sessions(user_id,access_token_hash,refresh_family_id,refresh_hash,expires_at,refresh_expires_at)
      VALUES($1,$2,$3,$4,$5,$6) RETURNING ${sessionColumns}`, [p.userId,p.accessTokenHash,p.refreshFamilyId,p.refreshHash,p.expiresAt,p.refreshExpiresAt]);
    return rows[0]!;
  }
  async getSessionByAccessTokenHash(hash: string): Promise<DbSession | null> {
    const { rows } = await this.query<DbSession>(`SELECT ${sessionColumns} FROM sessions WHERE access_token_hash=$1 AND revoked_at IS NULL`, [hash]);
    return rows[0] ?? null;
  }
  async getSessionByRefreshHash(hash: string): Promise<DbSession | null> {
    const { rows } = await this.query<DbSession>(`SELECT ${sessionColumns} FROM sessions WHERE refresh_hash=$1`, [hash]);
    return rows[0] ?? null;
  }
  async rotateSession(p: Parameters<ITelemetryRepository['rotateSession']>[0]): Promise<DbSession> {
    const result = await this.transaction(async (client) => {
      const { rows } = await client.query<{ user_id: string }>(`UPDATE sessions SET revoked_at=NOW()
        WHERE id=$1 AND revoked_at IS NULL AND refresh_expires_at>NOW() RETURNING user_id`, [p.oldSessionId]);
      if (!rows[0]) {
        await client.query('UPDATE sessions SET revoked_at=NOW() WHERE refresh_family_id=$1', [p.refreshFamilyId]);
        return null;
      }
      const inserted = await client.query<DbSession>(`INSERT INTO sessions(user_id,access_token_hash,refresh_family_id,refresh_hash,expires_at,refresh_expires_at)
        VALUES($1,$2,$3,$4,$5,$6) RETURNING ${sessionColumns}`, [rows[0].user_id,p.newAccessTokenHash,p.refreshFamilyId,p.newRefreshHash,p.expiresAt,p.refreshExpiresAt]);
      return inserted.rows[0]!;
    });
    if (!result) throw new Error('REVOKED_REFRESH_TOKEN');
    return result;
  }
  async revokeSessionFamily(id: string): Promise<void> {
    await this.query('UPDATE sessions SET revoked_at=NOW() WHERE refresh_family_id=$1', [id]);
  }

  async getDevice(siteId: string, rawId: string): Promise<DbDevice | null> {
    const { rows } = await this.query<DbDevice>(`SELECT id,raw_device_id AS "rawDeviceId",site_id AS "siteId",enabled,
      expected_interval_ms AS "expectedIntervalMs",config_version AS "configVersion"
      FROM devices WHERE site_id=$1 AND (raw_device_id=$2 OR id::text=$2)`, [siteId,rawId]);
    return rows[0] ?? null;
  }
  async getDeviceChannels(siteId: string, deviceId: string): Promise<DbChannel[]> {
    const { rows } = await this.query<DbChannel>(`SELECT c.raw_channel_id AS "rawChannelId",c.display_slot AS "displaySlot",c.label,c.enabled
      FROM device_channels c JOIN devices d ON c.device_id=d.id WHERE d.site_id=$1 AND (d.raw_device_id=$2 OR d.id::text=$2)
      ORDER BY c.display_slot NULLS LAST,c.raw_channel_id`, [siteId,deviceId]);
    return rows;
  }
  async listDevices(): Promise<DbDevice[]> {
    const { rows } = await this.query<DbDevice>(`SELECT id,raw_device_id AS "rawDeviceId",site_id AS "siteId",enabled,
      expected_interval_ms AS "expectedIntervalMs",config_version AS "configVersion" FROM devices WHERE enabled=true`);
    return rows;
  }
  async updateDeviceMapping(siteId: string, deviceId: string, version: number, mappings: ChannelMappingItem[], actorId: string) {
    const result = await this.transaction(async (client) => {
      const { rows } = await client.query<{ id: string; config_version: number }>(`UPDATE devices SET config_version=config_version+1
        WHERE site_id=$1 AND raw_device_id=$2 AND config_version=$3 RETURNING id,config_version`, [siteId,deviceId,version]);
      if (!rows[0]) throw new Error('OPTIMISTIC_LOCK_CONFLICT');
      const before = await client.query('SELECT raw_channel_id,display_slot,label,enabled FROM device_channels WHERE device_id=$1', [rows[0].id]);
      await client.query('UPDATE device_channels SET enabled=false,display_slot=NULL WHERE device_id=$1', [rows[0].id]);
      for (const m of mappings) {
        await client.query(`INSERT INTO device_channels(device_id,raw_channel_id,display_slot,label,enabled)
          VALUES($1,$2,$3,$4,$5) ON CONFLICT(device_id,raw_channel_id) DO UPDATE
          SET display_slot=EXCLUDED.display_slot,label=EXCLUDED.label,enabled=EXCLUDED.enabled`, [rows[0].id,m.channelId,m.displaySlot,m.label,m.enabled]);
      }
      await client.query(`INSERT INTO audit_log(site_id,actor_id,action,target,before_json,after_json)
        VALUES($1,$2,'UPDATE_DEVICE_MAPPING',$3,$4,$5)`, [siteId,actorId,`device:${deviceId}`,JSON.stringify(before.rows),JSON.stringify(mappings)]);
      return rows[0].config_version;
    });
    return { configVersion: result, channels: await this.getDeviceChannels(siteId,deviceId) };
  }

  async insertTelemetryBatch(records: TelemetryPayload[], checkpoint?: { offset: number; eventId?: string }): Promise<{ inserted: number }> {
    return this.transaction(async (client) => {
      const committed = records.map((r) => ({ ...r, persistence: 'committed' }));
      const result = await client.query(`INSERT INTO runtime_telemetry(event_id,site_id,device_id,channel_id,received_at,payload)
        SELECT (r->>'eventId')::uuid,(r->>'siteId')::uuid,r->>'deviceId',r->>'channelId',(r->>'receivedAt')::timestamptz,r
        FROM jsonb_array_elements($1::jsonb) r
        WHERE EXISTS(SELECT 1 FROM devices d JOIN device_channels c ON c.device_id=d.id
          WHERE d.site_id=(r->>'siteId')::uuid AND d.raw_device_id=r->>'deviceId' AND d.enabled
          AND c.raw_channel_id=r->>'channelId' AND c.enabled)
        ON CONFLICT(event_id) DO NOTHING`, [JSON.stringify(committed)]);
      if (checkpoint) await client.query(`INSERT INTO runtime_documents(kind,id,payload) VALUES('checkpoint','telemetry_persister',$1)
        ON CONFLICT(kind,id) DO UPDATE SET payload=EXCLUDED.payload,updated_at=NOW()`, [JSON.stringify(checkpoint)]);
      return { inserted: result.rowCount ?? 0 };
    });
  }
  async getLatestTelemetry(siteId: string, deviceId: string): Promise<Map<string, TelemetryPayload>> {
    const { rows } = await this.query<{ payload: TelemetryPayload }>(`SELECT DISTINCT ON(channel_id) payload FROM runtime_telemetry
      WHERE site_id=$1 AND device_id=$2 ORDER BY channel_id,received_at DESC,event_id`, [siteId,deviceId]);
    return new Map(rows.map(({ payload }) => [payload.channelId,payload]));
  }
  async queryTelemetryHistory(siteId: string, deviceId: string, options: Parameters<ITelemetryRepository['queryTelemetryHistory']>[2]): Promise<HistoryQueryResult> {
    const cutoff = options.cutoff ?? new Date().toISOString();
    const params = [siteId,deviceId,options.channelId === 'all' ? null : options.channelId ?? null,options.from ?? null,options.to ?? null,cutoff];
    const where = `site_id=$1 AND device_id=$2 AND ($3::text IS NULL OR channel_id=$3)
      AND ($4::timestamptz IS NULL OR received_at>=$4) AND ($5::timestamptz IS NULL OR received_at<=$5) AND received_at<=$6`;
    const limit = Number.isFinite(options.limit) ? Math.max(1,Math.min(10000,options.limit!)) : 100;
    const offset = Number.isFinite(options.offset) ? Math.max(0,options.offset!) : 0;
    const { rows } = await this.query<{ payload: TelemetryPayload }>(`SELECT payload FROM runtime_telemetry WHERE ${where} ORDER BY received_at DESC,event_id LIMIT $7 OFFSET $8`, [...params,limit,offset]);
    const count = await this.query<{ total: string }>(`SELECT COUNT(*) AS total FROM runtime_telemetry WHERE ${where}`, params);
    return { samples: rows.map((r) => r.payload), total: Number(count.rows[0]?.total ?? 0), cutoff };
  }
  async getTelemetryHistory(siteId: string, deviceId: string, channelId: string, from?: string, to?: string, limit?: number, offset?: number, cutoff?: string): Promise<TelemetryPayload[]> {
    return (await this.queryTelemetryHistory(siteId,deviceId,{ channelId,from,to,limit,offset,cutoff })).samples;
  }
  async getCheckpoint(id: string): Promise<{ offset: number; eventId: string | null } | null> { return this.document('checkpoint',id); }

  private async document<T>(kind: string, id: string): Promise<T | null> {
    const { rows } = await this.query<{ payload: T }>('SELECT payload FROM runtime_documents WHERE kind=$1 AND id=$2', [kind,id]);
    return rows[0]?.payload ?? null;
  }
  private async putDocument(kind: string, id: string, payload: unknown, siteId: string | null = null): Promise<void> {
    const result = await this.query(`INSERT INTO runtime_documents(kind,id,site_id,payload) VALUES($1,$2,$3,$4)
      ON CONFLICT(kind,id) DO UPDATE SET payload=EXCLUDED.payload,updated_at=NOW()
      WHERE runtime_documents.site_id IS NOT DISTINCT FROM EXCLUDED.site_id`, [kind,id,siteId,JSON.stringify(payload)]);
    if (!result.rowCount) throw new Error('RESOURCE_NOT_FOUND');
  }
  async saveWorkerStatus(status: WorkerStatus): Promise<void> { await this.putDocument('worker','mqtt',status); }
  async getWorkerStatus(): Promise<WorkerStatus | null> { return this.document('worker','mqtt'); }
  async getUserPreferences(userId: string): Promise<UserPreferences> {
    return await this.document<UserPreferences>('preferences',userId) ?? { userId,timezone:'Asia/Kolkata',preferredDeviceId:'prototype1',displayPreferences:{} };
  }
  async updateUserPreferences(userId: string, prefs: Partial<Omit<UserPreferences,'userId'>>): Promise<UserPreferences> {
    const updated = { ...await this.getUserPreferences(userId),...prefs,userId,updatedAt:new Date().toISOString() };
    await this.putDocument('preferences',userId,updated);
    return updated;
  }
  async addAuditLog(entry: Omit<DbAuditLog,'id'|'at'>): Promise<void> {
    await this.query(`INSERT INTO audit_log(site_id,actor_id,action,target,before_json,after_json,request_id)
      VALUES($1,$2,$3,$4,$5,$6,$7)`, [entry.siteId,entry.actorId,entry.action,entry.target,JSON.stringify(entry.beforeJson),JSON.stringify(entry.afterJson),entry.requestId ?? null]);
  }
  async getAuditLogs(siteId: string, limit = 50): Promise<DbAuditLog[]> {
    const { rows } = await this.query<DbAuditLog>(`SELECT id,site_id AS "siteId",actor_id AS "actorId",action,target,
      before_json AS "beforeJson",after_json AS "afterJson",at::text AS at,request_id AS "requestId"
      FROM audit_log WHERE site_id=$1 ORDER BY at DESC LIMIT $2`, [siteId,Math.min(500,Math.max(1,limit))]);
    return rows;
  }
  async getAlertRules(siteId: string, deviceId?: string): Promise<AlertRule[]> {
    const { rows } = await this.query<{ payload: AlertRule }>(`SELECT payload FROM runtime_documents WHERE kind='rule' AND site_id=$1
      AND ($2::text IS NULL OR payload->>'deviceId'=$2) ORDER BY id`, [siteId,deviceId ?? null]);
    return rows.map((r) => r.payload);
  }
  async saveAlertRule(rule: AlertRule, actorId: string): Promise<AlertRule> {
    const before = await this.document<AlertRule>('rule',rule.id);
    if (before && before.siteId !== rule.siteId) throw new Error('RESOURCE_NOT_FOUND');
    const updated = { ...rule,version:(before?.version ?? 0)+1,updatedAt:new Date().toISOString() };
    await this.putDocument('rule',rule.id,updated,rule.siteId);
    await this.addAuditLog({ siteId:rule.siteId,actorId,action:before?'UPDATE_ALERT_RULE':'CREATE_ALERT_RULE',target:`rule:${rule.id}`,beforeJson:before,afterJson:updated });
    return updated;
  }
  async deleteAlertRule(siteId: string, id: string, actorId: string): Promise<boolean> {
    const before = await this.document<AlertRule>('rule',id);
    const result = await this.query("DELETE FROM runtime_documents WHERE kind='rule' AND id=$1 AND site_id=$2", [id,siteId]);
    if (result.rowCount) await this.addAuditLog({ siteId,actorId,action:'DELETE_ALERT_RULE',target:`rule:${id}`,beforeJson:before,afterJson:null });
    return !!result.rowCount;
  }
  async getAlerts(siteId: string, deviceId?: string, state?: 'open'|'acknowledged'|'resolved'): Promise<AlertRecord[]> {
    const { rows } = await this.query<{ payload: AlertRecord; rule: AlertRule | null }>(`SELECT a.payload,r.payload AS rule FROM runtime_documents a
      LEFT JOIN runtime_documents r ON r.kind='rule' AND r.id=a.payload->>'ruleId' AND r.site_id=a.site_id
      WHERE a.kind='alert' AND a.site_id=$1 AND ($2::text IS NULL OR a.payload->>'deviceId'=$2)
      AND ($3::text IS NULL OR a.payload->>'state'=$3) ORDER BY a.updated_at DESC`, [siteId,deviceId ?? null,state ?? null]);
    return rows.map((r) => ({ ...r.payload,rule:r.rule ?? undefined }));
  }
  async saveAlert(alert: AlertRecord): Promise<void> {
    const rule = await this.document<AlertRule>('rule',alert.ruleId);
    if (!rule) throw new Error('RULE_NOT_FOUND');
    // Acknowledgements belong to users, not the evaluator's in-memory snapshot.
    const existing = await this.document<AlertRecord>('alert',alert.id);
    await this.putDocument('alert',alert.id,{ ...alert,acknowledgements:existing?.acknowledgements ?? alert.acknowledgements,
      state:alert.state === 'open' && existing?.state === 'acknowledged' ? 'acknowledged' : alert.state },rule.siteId);
  }
  async acknowledgeAlert(id: string, userId: string, displayName?: string, note?: string): Promise<AlertRecord> {
    return this.transaction(async (client) => {
      const { rows } = await client.query<{ payload: AlertRecord; site_id: string }>("SELECT payload,site_id FROM runtime_documents WHERE kind='alert' AND id=$1 FOR UPDATE", [id]);
      const row = rows[0];
      if (!row) throw new Error('ALERT_NOT_FOUND');
      const role = await client.query("SELECT 1 FROM memberships WHERE user_id=$1 AND site_id=$2 AND role IN('operator','admin')", [userId,row.site_id]);
      if (!role.rowCount) throw new Error('ALERT_NOT_FOUND');
      const ack: AlertAcknowledgement = { id:crypto.randomUUID(),alertId:id,userId,userDisplayName:displayName,ackAt:new Date().toISOString(),note:note ?? null };
      const updated: AlertRecord = { ...row.payload,state:row.payload.state === 'open'?'acknowledged':row.payload.state,
        acknowledgements:[...row.payload.acknowledgements.filter((a) => a.userId !== userId),ack] };
      await client.query("UPDATE runtime_documents SET payload=$2,updated_at=NOW() WHERE kind='alert' AND id=$1", [id,JSON.stringify(updated)]);
      return updated;
    });
  }
}
