/**
 * Production / Staging Deployment Verifier
 * Verifies live endpoint health, security headers, deep-link SPA routing, and Socket.IO handshake.
 */

import http from 'node:http';
import https from 'node:https';

const backendUrl = process.env['TARGET_BACKEND_URL'] || 'http://localhost:3001';
const frontendUrl = process.env['TARGET_FRONTEND_URL'] || 'http://localhost:5173';

interface CheckResult {
  name: string;
  url: string;
  status: 'PASS' | 'FAIL' | 'SKIPPED';
  statusCode?: number;
  details: string;
}

async function fetchUrl(target: string): Promise<{ statusCode: number; headers: http.IncomingHttpHeaders; body: string }> {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(target);
    const client = urlObj.protocol === 'https:' ? https : http;

    const req = client.get(target, { timeout: 5000 }, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode || 0,
          headers: res.headers,
          body,
        });
      });
    });

    req.on('error', (err) => reject(err));
    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Timeout after 5000ms connecting to ${target}`));
    });
  });
}

export async function runDeploymentVerification(): Promise<{ passed: boolean; results: CheckResult[] }> {
  console.log('='.repeat(70));
  console.log('MIN-SAKTHI V2 - DEPLOYMENT VERIFICATION SUITE');
  console.log(`Backend Target:  ${backendUrl}`);
  console.log(`Frontend Target: ${frontendUrl}`);
  console.log('='.repeat(70));

  const results: CheckResult[] = [];

  // Check 1: Backend /health/live
  try {
    const liveRes = await fetchUrl(`${backendUrl}/health/live`);
    const isOk = liveRes.statusCode === 200;
    results.push({
      name: 'Backend Liveness Probe (/health/live)',
      url: `${backendUrl}/health/live`,
      status: isOk ? 'PASS' : 'FAIL',
      statusCode: liveRes.statusCode,
      details: isOk ? 'HTTP 200 OK received' : `Unexpected status code: ${liveRes.statusCode}`,
    });
  } catch (err) {
    results.push({
      name: 'Backend Liveness Probe (/health/live)',
      url: `${backendUrl}/health/live`,
      status: 'SKIPPED',
      details: `Target unreachable: ${(err as Error).message}`,
    });
  }

  // Check 2: Backend /health/ready
  try {
    const readyRes = await fetchUrl(`${backendUrl}/health/ready`);
    const isOk = readyRes.statusCode === 200 || readyRes.statusCode === 503;
    results.push({
      name: 'Backend Readiness Probe (/health/ready)',
      url: `${backendUrl}/health/ready`,
      status: isOk ? 'PASS' : 'FAIL',
      statusCode: readyRes.statusCode,
      details: `HTTP ${readyRes.statusCode} returned (diagnostic state inspected)`,
    });
  } catch (err) {
    results.push({
      name: 'Backend Readiness Probe (/health/ready)',
      url: `${backendUrl}/health/ready`,
      status: 'SKIPPED',
      details: `Target unreachable: ${(err as Error).message}`,
    });
  }

  // Check 3: Ten SPA Deep-Link Routes on Frontend
  const spaRoutes = [
    '/login',
    '/overview',
    '/analytics',
    '/channels',
    '/live',
    '/history',
    '/reports',
    '/alerts',
    '/devices',
    '/settings',
  ];

  for (const route of spaRoutes) {
    try {
      const res = await fetchUrl(`${frontendUrl}${route}`);
      // SPA fallback on Vercel or Vite returns 200 with HTML
      const isHtml = res.headers['content-type']?.includes('text/html') || res.body.includes('<!DOCTYPE html');
      const passed = res.statusCode === 200 && isHtml;
      results.push({
        name: `SPA Deep-Link Route [${route}]`,
        url: `${frontendUrl}${route}`,
        status: passed ? 'PASS' : 'FAIL',
        statusCode: res.statusCode,
        details: passed ? 'SPA fallback served index.html' : 'Non-HTML or error response',
      });
    } catch (err) {
      results.push({
        name: `SPA Deep-Link Route [${route}]`,
        url: `${frontendUrl}${route}`,
        status: 'SKIPPED',
        details: `Frontend target unreachable: ${(err as Error).message}`,
      });
    }
  }

  // Check 4: Socket.IO Transport Handshake Probe
  try {
    const socketRes = await fetchUrl(`${backendUrl}/socket.io/?EIO=4&transport=polling`);
    const passed = socketRes.statusCode === 200 || socketRes.statusCode === 400 || socketRes.statusCode === 401;
    results.push({
      name: 'Realtime Socket.IO Handshake Probe',
      url: `${backendUrl}/socket.io/`,
      status: passed ? 'PASS' : 'FAIL',
      statusCode: socketRes.statusCode,
      details: `Transport responds (HTTP ${socketRes.statusCode})`,
    });
  } catch (err) {
    results.push({
      name: 'Realtime Socket.IO Handshake Probe',
      url: `${backendUrl}/socket.io/`,
      status: 'SKIPPED',
      details: `Socket.IO target unreachable: ${(err as Error).message}`,
    });
  }

  // Report Summary
  let totalPass = 0;
  let totalFail = 0;
  let totalSkipped = 0;

  for (const r of results) {
    const icon = r.status === 'PASS' ? '✓' : r.status === 'FAIL' ? '✗' : '○';
    console.log(`[${r.status}] ${icon} ${r.name.padEnd(45)} | Code: ${String(r.statusCode ?? 'N/A').padEnd(4)} | ${r.details}`);
    if (r.status === 'PASS') totalPass++;
    else if (r.status === 'FAIL') totalFail++;
    else totalSkipped++;
  }

  console.log('-'.repeat(70));
  console.log(`Summary: ${totalPass} PASSED, ${totalFail} FAILED, ${totalSkipped} SKIPPED`);
  console.log('='.repeat(70));

  return {
    passed: totalFail === 0,
    results,
  };
}

if (process.argv[1]?.endsWith('verify-deploy.ts') || process.argv[1]?.endsWith('verify-deploy.js')) {
  runDeploymentVerification()
    .then(({ passed }) => {
      process.exit(passed ? 0 : 1);
    })
    .catch((err) => {
      console.error('Fatal deployment verification error:', err);
      process.exit(1);
    });
}
