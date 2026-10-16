import assert from 'node:assert/strict';
import { io } from 'socket.io-client';

let server;
let repo;
let base = process.env.CLOUD_BASE_URL;
if (!base) {
  server = (await import('../apps/server/dist/cloud-api.js')).default;
  const db = await import('../apps/server/dist/storage/db.js');
  repo = db.getTelemetryRepository();
  await new Promise((resolve) => server.listen(0,'127.0.0.1',resolve));
  base = `http://127.0.0.1:${server.address().port}`;
}
const json = async (path,options) => {
  const response = await fetch(`${base}${path}`,options);
  assert.ok(response.headers.get('content-type')?.includes('application/json'),`${path} must serve the API, not SPA HTML`);
  return { response,data:await response.json() };
};
let socket;
try {
  const health = await json('/health/ready');
  assert.equal(health.response.status,200);
  assert.equal(health.data.database,'connected');
  const login = await json('/api/v1/auth/login',{ method:'POST',headers:{'content-type':'application/json'},
    body:JSON.stringify({ email:process.env.BOOTSTRAP_ADMIN_EMAIL,password:process.env.BOOTSTRAP_ADMIN_PASSWORD }) });
  assert.equal(login.response.status,200);
  assert.equal(login.data.user.role,'admin');
  const headers = { authorization:`Bearer ${login.data.accessToken}` };
  assert.equal((await json('/api/v1/me',{ headers })).response.status,200);
  assert.equal((await json('/api/v1/me')).response.status,401);
  const device = await json(`/api/v1/sites/${login.data.user.siteId}/devices/prototype1`,{ headers });
  assert.equal(device.response.status,200);
  assert.equal(device.data.channels.length,5);
  assert.equal((await json('/api/v1/sites/22222222-2222-4222-8222-222222222222/devices/prototype1',{ headers })).response.status,403);
  socket = io(base,{ transports:['websocket'],auth:{token:login.data.accessToken},reconnection:false,timeout:15000 });
  const snapshot = await new Promise((resolve,reject) => {
    const timer=setTimeout(() => reject(new Error('Socket snapshot timed out')),20000);
    socket.on('connect',() => socket.emit('device:subscribe',{ requestId:'deployment-check',selectionGeneration:1,siteId:login.data.user.siteId,deviceId:'prototype1' }));
    socket.on('state:snapshot',(value) => { clearTimeout(timer); resolve(value); });
    socket.on('connect_error',(error) => { clearTimeout(timer); reject(error); });
  });
  assert.equal(snapshot.channels.length,5);
  assert.equal(snapshot.siteId,login.data.user.siteId);
  socket.disconnect();
  const cookie = login.response.headers.get('set-cookie')?.split(';')[0];
  assert.ok(cookie);
  const refresh = await json('/api/v1/auth/refresh',{ method:'POST',headers:{cookie} });
  assert.equal(refresh.response.status,200);
  assert.equal((await json('/api/v1/me',{ headers })).response.status,401);
  const newCookie=refresh.response.headers.get('set-cookie')?.split(';')[0];
  assert.equal((await json('/api/v1/auth/logout',{ method:'POST',headers:{cookie:newCookie} })).response.status,200);
  assert.equal((await json('/api/v1/me',{ headers:{ authorization:`Bearer ${refresh.data.accessToken}` } })).response.status,401);
  console.log(JSON.stringify({ status:'PASS',base,database:'connected',login:true,refresh:true,logout:true,tenantIsolation:true,socketSnapshot:true,broker:health.data.broker,worker:health.data.worker }));
} finally {
  socket?.disconnect();
  if (server) { server.closeAllConnections(); await new Promise((resolve) => server.close(resolve)); }
  await repo?.close();
}
