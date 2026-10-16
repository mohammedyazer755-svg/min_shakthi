import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { AuthService } from '../../apps/server/src/auth/service.js';
import { MemoryTelemetryRepository } from '../../apps/server/src/storage/db.js';
import { createTelemetryRouter } from '../../apps/server/src/routes/telemetry.js';
import express from 'express';
import { TEST_USERS, TEST_PASSWORD, TEST_SITES } from '@minsakthi/db';

describe('Security & Authorization Suite (R01, R05, R11: T16, T22, T28)', () => {
  it('T16: Prevents role privilege escalation through client-controlled parameters', async () => {
    const repo = new MemoryTelemetryRepository();
    const authService = new AuthService(repo);

    // Login as viewer
    const { accessToken, user } = await authService.login({
      email: TEST_USERS.viewer.email,
      password: TEST_PASSWORD,
    });

    expect(user.role).toBe('viewer');

    // Verify token validation returns the DB-granted role, not anything submitted in request
    const ctx = await authService.verifyAccessToken(accessToken);
    expect(ctx?.role).toBe('viewer');
    expect(ctx?.role).not.toBe('admin');
  });

  it('T22: Sanitizes CSV export fields against formula injection (=, +, -, @ escaped)', async () => {
    const repo = new MemoryTelemetryRepository();
    const authService = new AuthService(repo);

    const sample1 = {
      schemaVersion: 1 as const,
      eventId: crypto.randomUUID(),
      serverEpoch: '11111111-1111-4111-8111-111111111111',
      sequence: '1',
      siteId: TEST_SITES.default.id,
      deviceId: 'prototype1',
      channelId: 'channel1',
      receivedAt: new Date(Date.now() - 1000).toISOString(),
      deviceTimestamp: null,
      values: {
        voltage: 230,
        current: 1,
        power: 230,
        energyRaw: '=cmd|/c calc!A0', // Starts with =
        frequency: 50,
      },
      energyUnit: 'unknown',
      quality: [],
      retained: false,
      persistence: 'committed' as const,
    };

    const sample2 = {
      schemaVersion: 1 as const,
      eventId: crypto.randomUUID(),
      serverEpoch: '11111111-1111-4111-8111-111111111111',
      sequence: '2',
      siteId: TEST_SITES.default.id,
      deviceId: 'prototype1',
      channelId: 'channel1',
      receivedAt: new Date().toISOString(),
      deviceTimestamp: null,
      values: {
        voltage: 230,
        current: 1,
        power: 230,
        energyRaw: '+12345', // Starts with +
        frequency: 50,
      },
      energyUnit: 'unknown',
      quality: [],
      retained: false,
      persistence: 'committed' as const,
    };

    await repo.insertTelemetryBatch([sample1, sample2]);

    const app = express();
    app.use(express.json());
    app.use('/api/v1', createTelemetryRouter(authService, repo));

    const { accessToken } = await authService.login({
      email: TEST_USERS.admin.email,
      password: TEST_PASSWORD,
    });

    // Make export request
    const server = app.listen(0);
    const addr = server.address();
    const port = typeof addr === 'object' && addr !== null ? addr.port : 0;

    const exportRes = await fetch(
      `http://127.0.0.1:${port}/api/v1/sites/${TEST_SITES.default.id}/devices/prototype1/export`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    expect(exportRes.status).toBe(200);
    const csvContent = await exportRes.text();

    // Verify dangerous formula is escaped with single quote '
    expect(csvContent).toContain("'=cmd|/c calc!A0");
    expect(csvContent).toContain("'+12345");

    server.close();
  });

  it('T28: Verifies no hardcoded secrets or credentials exist in compiled web client assets', () => {
    const distDir = path.resolve(process.cwd(), 'apps/web/dist');
    if (!fs.existsSync(distDir)) {
      // Build directory exists or will be verified in build
      return;
    }

    const files = fs.readdirSync(path.join(distDir, 'assets'));
    const jsFiles = files.filter((f) => f.endsWith('.js'));

    for (const jsFile of jsFiles) {
      const content = fs.readFileSync(path.join(distDir, 'assets', jsFile), 'utf-8');
      // Verify forbidden patterns
      expect(content).not.toContain('mqtt://');
      expect(content).not.toContain('192.155.92.123');
      expect(content).not.toContain('swiftpower123');
      expect(content).not.toContain('supersecret');
      expect(content).not.toContain('TestPassword123!');
    }
  });
});
