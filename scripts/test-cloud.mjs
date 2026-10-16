import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import pg from 'pg';
import { runMigrations, hashPassword } from '../packages/db/dist/index.js';
import { PostgresTelemetryRepository } from '../apps/server/dist/storage/postgres.js';
import { AuthService } from '../apps/server/dist/auth/service.js';
import { cloudSnapshot } from '../apps/server/dist/realtime/cloud-snapshot.js';

// Real database checks in a fresh, isolated schema. Never send test MQTT to hardware.
const url = process.env.DATABASE_URL_UNPOOLED || process.env.POSTGRES_URL_NON_POOLING || process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is required for isolated cloud checks.');
const admin = new pg.Pool({ connectionString:url });
const schema = `cloud_test_${crypto.randomBytes(8).toString('hex')}`;
await admin.query(`CREATE SCHEMA ${schema}`);
const scopedUrl = new URL(url);
scopedUrl.searchParams.set('options',`-c search_path=${schema},public`);
// Use a separate migration ledger, not the public schema's existing ledger.
await admin.query(`CREATE TABLE ${schema}.schema_migrations(name VARCHAR(255) PRIMARY KEY,applied_at TIMESTAMPTZ DEFAULT NOW())`);
const first = new PostgresTelemetryRepository(scopedUrl.href);
const second = new PostgresTelemetryRepository(scopedUrl.href);
try {
  await runMigrations(scopedUrl.href);
  const site = crypto.randomUUID();
  const otherSite = crypto.randomUUID();
  const user = crypto.randomUUID();
  const password = crypto.randomBytes(20).toString('hex');
  await first.pool.query("INSERT INTO sites(id,name) VALUES($1,'Isolated test'),($2,'Other tenant')",[site,otherSite]);
  await first.pool.query("INSERT INTO users(id,normalized_email,password_hash,display_name) VALUES($1,'test@example.test',$2,'Cloud test')",[user,hashPassword(password)]);
  await first.pool.query("INSERT INTO memberships(user_id,site_id,role) VALUES($1,$2,'admin')",[user,site]);
  const dev = await first.pool.query("INSERT INTO devices(site_id,raw_device_id) VALUES($1,'test_device') RETURNING id",[site]);
  await first.pool.query("INSERT INTO device_channels(device_id,raw_channel_id,display_slot,label) VALUES($1,'channel1',1,'Test channel')",[dev.rows[0].id]);
  const authOne = new AuthService(first);
  const authTwo = new AuthService(second);
  const login = await authOne.login({ email:'test@example.test',password });
  assert.equal((await authTwo.verifyAccessToken(login.accessToken))?.userId,user);
  const rotated = await authTwo.refresh(login.refreshToken);
  assert.equal(await authOne.verifyAccessToken(login.accessToken),null);
  assert.equal((await authOne.verifyAccessToken(rotated.accessToken))?.userId,user);
  await authOne.logout(rotated.refreshToken);
  assert.equal(await authTwo.verifyAccessToken(rotated.accessToken),null);
  const concurrent = await authOne.login({ email:'test@example.test',password });
  const races = await Promise.allSettled([authOne.refresh(concurrent.refreshToken),authTwo.refresh(concurrent.refreshToken)]);
  assert.equal(races.filter((r) => r.status === 'fulfilled').length,1);
  assert.equal(races.filter((r) => r.status === 'rejected').length,1);
  const winner = races.find((r) => r.status === 'fulfilled').value;
  assert.equal(await authOne.verifyAccessToken(winner.accessToken),null);
  const sample = { schemaVersion:1,eventId:crypto.randomUUID(),serverEpoch:crypto.randomUUID(),sequence:'1',
    siteId:site,deviceId:'test_device',channelId:'channel1',receivedAt:new Date().toISOString(),deviceTimestamp:null,
    values:{ voltage:230,current:1,power:230,energyRaw:'0.1',frequency:50 },energyUnit:'unknown',quality:[],retained:false,persistence:'pending' };
  assert.equal((await first.insertTelemetryBatch([sample])).inserted,1);
  assert.equal((await second.insertTelemetryBatch([sample])).inserted,0);
  assert.equal((await second.getLatestTelemetry(site,'test_device')).get('channel1').persistence,'committed');
  assert.equal((await second.getLatestTelemetry(otherSite,'test_device')).size,0);
  assert.equal((await second.queryTelemetryHistory(otherSite,'test_device',{})).total,0);
  assert.equal((await first.insertTelemetryBatch([{...sample,eventId:crypto.randomUUID(),siteId:otherSite}])).inserted,0);
  await first.saveWorkerStatus({ at:new Date().toISOString(),epoch:sample.serverEpoch,connected:true,subscribed:true,received:1,accepted:1,quarantined:0 });
  const snap = await cloudSnapshot(second,'test-request',1,site,'test_device');
  assert.equal(snap.channels[0].lastSample.eventId,sample.eventId);
  assert.equal(snap.health.brokerSubscribed,true);
  assert.equal(snap.channels[1].freshness,'unconfigured');
  await first.updateUserPreferences(user,{ timezone:'Asia/Kolkata',preferredDeviceId:'test_device' });
  assert.equal((await second.getUserPreferences(user)).preferredDeviceId,'test_device');
  await first.updateDeviceMapping(site,'test_device',1,[{ channelId:'channel1',displaySlot:1,label:'Updated',enabled:true }],user);
  await assert.rejects(second.updateDeviceMapping(site,'test_device',1,[],user),/OPTIMISTIC_LOCK_CONFLICT/);
  assert.equal((await second.getDeviceChannels(site,'test_device'))[0].label,'Updated');
  assert.ok((await second.getAuditLogs(site)).length>0);
  console.log('PASS: cross-instance login/refresh/logout, concurrent refresh replay protection, durable telemetry, duplicate handling, tenant isolation, snapshots, preferences, mapping conflicts, and audit persistence.');
} finally {
  await first.close();
  await second.close();
  // The generated identifier is owned by this test and restricted to a hexadecimal suffix.
  await admin.query(`DROP SCHEMA ${schema} CASCADE`);
  await admin.end();
}
