import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import pg from 'pg';
import http from 'node:http';
import { io } from 'socket.io-client';
import { runMigrations, hashPassword } from '../packages/db/dist/index.js';
import { PostgresTelemetryRepository } from '../apps/server/dist/storage/postgres.js';
import { AuthService } from '../apps/server/dist/auth/service.js';
import { cloudSnapshot } from '../apps/server/dist/realtime/cloud-snapshot.js';
import { RealtimeSocketServer } from '../apps/server/dist/realtime/socket.js';

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
let socketServer;
let socket;
let heartbeatTimer;
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
  // Exercise the actual cross-process database-to-WebSocket path without production MQTT.
  await first.pool.query('UPDATE devices SET expected_interval_ms=5000 WHERE id=$1',[dev.rows[0].id]);
  let brokerConnected=true;
  const heartbeat=() => first.saveWorkerStatus({at:new Date().toISOString(),epoch:sample.serverEpoch,
    connected:brokerConnected,subscribed:brokerConnected,received:1,accepted:1,quarantined:0});
  await heartbeat();
  heartbeatTimer=setInterval(() => { void heartbeat().catch(() => {}); },1000);
  const httpServer=http.createServer();
  socketServer=new RealtimeSocketServer(httpServer,authOne,second);
  await new Promise((resolve) => httpServer.listen(0,'127.0.0.1',resolve));
  const socketLogin=await authOne.login({email:'test@example.test',password});
  socket=io(`http://127.0.0.1:${httpServer.address().port}`,{transports:['websocket'],auth:{token:socketLogin.accessToken},reconnection:false,autoConnect:false});
  let stage='initial snapshot';
  let latestState;
  socket.on('state:snapshot',s => {latestState={freshness:s.channels[0].freshness,broker:s.health.broker,worker:s.health.process,ageMs:s.channels[0].lastReceivedAt ? Date.now()-Date.parse(s.channels[0].lastReceivedAt) : null};});
  const waitFor=(event,predicate,timeout=15000) => new Promise((resolve,reject) => {
    const listener=(value) => { if (predicate(value)) { clearTimeout(timer); socket.off(event,listener); resolve(value); } };
    const timer=setTimeout(() => {socket.off(event,listener);reject(new Error(`Timeout: ${stage} ${JSON.stringify(latestState)}`));},timeout);
    socket.on(event,listener);
  });
  const initial=waitFor('state:snapshot',() => true);
  socket.on('connect',() => socket.emit('device:subscribe',{requestId:'live-test',selectionGeneration:1,siteId:site,deviceId:'test_device'}));
  socket.connect();
  await initial;
  stage='first fresh packet';
  const live=waitFor('state:snapshot',s => s.channels[0].freshness==='fresh');
  const started=Date.now();
  await first.insertTelemetryBatch([{...sample,eventId:crypto.randomUUID(),receivedAt:new Date().toISOString(),sequence:'2'}]);
  const committedAt=Date.now();
  assert.equal((await live).coverage.reportingSlots,1);
  const startupLatencyMs=Date.now()-started;
  const afterCommitLatencyMs=Date.now()-committedAt;
  // This runner is cross-region from Neon. Record timing; the hosted <=2s goal needs hosted measurements.
  assert.ok(startupLatencyMs<10000,`Cross-region first packet delivery took ${startupLatencyMs}ms`);
  stage='stale after packet silence';
  const stale=await waitFor('state:snapshot',s => s.channels[0].freshness==='stale');
  assert.equal(stale.coverage.reportingSlots,0);
  stage='offline after packet silence';
  const offline=await waitFor('state:snapshot',s => s.channels[0].freshness==='offline_inferred');
  assert.equal(offline.health.brokerSubscribed,true,'Broker subscription does not imply ESP activity');
  const offlineObservedMs=Date.now()-started;
  stage='retained packet';
  const retained=waitFor('state:snapshot',s => s.channels[0].lastSample?.retained===true);
  await first.insertTelemetryBatch([{...sample,eventId:crypto.randomUUID(),receivedAt:new Date().toISOString(),retained:true,sequence:'3'}]);
  assert.notEqual((await retained).channels[0].freshness,'fresh');
  brokerConnected=false;
  stage='broker disconnected';
  await heartbeat();
  assert.equal((await waitFor('state:snapshot',s => s.health.broker==='disconnected')).channels[0].freshness,'stale');
  brokerConnected=true;
  stage='recovered fresh packet';
  await heartbeat();
  const recovered=waitFor('state:snapshot',s => s.channels[0].freshness==='fresh');
  await first.insertTelemetryBatch([{...sample,eventId:crypto.randomUUID(),receivedAt:new Date().toISOString(),sequence:'4'}]);
  assert.equal((await recovered).coverage.reportingSlots,1);

  // A commit arriving after a previous poll's cutoff must still reach the packet stream.
  const delayed={...sample,eventId:crypto.randomUUID(),receivedAt:new Date().toISOString(),sequence:'5',persistence:'committed'};
  const transaction=await first.pool.connect();
  try {
    await transaction.query('BEGIN');
    await transaction.query('INSERT INTO runtime_telemetry(event_id,site_id,device_id,channel_id,received_at,payload) VALUES($1,$2,$3,$4,$5,$6)',
      [delayed.eventId,site,'test_device','channel1',delayed.receivedAt,JSON.stringify(delayed)]);
    await new Promise(resolve => setTimeout(resolve,1250));
    const delivery=waitFor('telemetry:update',s => s.eventId===delayed.eventId);
    await transaction.query('COMMIT');
    assert.equal((await delivery).eventId,delayed.eventId);
  } finally { await transaction.query('ROLLBACK'); transaction.release(); }
  console.log(JSON.stringify({liveState:'PASS',startupLatencyMs,afterCommitLatencyMs,offlineObservedMs,offlineLeaseMs:10000,retainedNotLive:true,brokerFailureSeparated:true,recovery:true,delayedCommitDelivered:true}));
  console.log('PASS: cross-instance login/refresh/logout, concurrent refresh replay protection, durable telemetry, duplicate handling, tenant isolation, snapshots, preferences, mapping conflicts, and audit persistence.');
} finally {
  if (heartbeatTimer) clearInterval(heartbeatTimer);
  socket?.disconnect();
  await socketServer?.close();
  await first.close();
  await second.close();
  // The generated identifier is owned by this test and restricted to a hexadecimal suffix.
  await admin.query(`DROP SCHEMA ${schema} CASCADE`);
  await admin.end();
}
