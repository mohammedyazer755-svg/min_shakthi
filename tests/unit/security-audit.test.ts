import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { spawnSync } from 'node:child_process';

describe('Security & Contract Compliance Audits', () => {
  it('confirms .env.example contains only empty secret names and no real credentials', () => {
    const envExamplePath = path.resolve(__dirname, '../../.env.example');
    const content = fs.readFileSync(envExamplePath, 'utf-8');

    const lines = content.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const [key, ...rest] = trimmed.split('=');
      const val = rest.join('=').trim();

      // Secret keys must have empty values
      if (
        key === 'MQTT_PASSWORD' ||
        key === 'MQTT_USERNAME' ||
        key === 'DATABASE_URL' ||
        key === 'AUTH_TOKEN_PEPPER' ||
        key === 'VITE_API_BASE_URL'
      ) {
        expect(val, `Secret variable ${key} must have empty value in .env.example`).toBe('');
      }
    }
  });

  it('confirms web client source code has zero MQTT credentials or broker passwords', () => {
    const webSrcDir = path.resolve(__dirname, '../../apps/web/src');
    const files = fs.readdirSync(webSrcDir, { recursive: true }) as string[];

    for (const f of files) {
      const fullPath = path.join(webSrcDir, f);
      if (fs.statSync(fullPath).isFile()) {
        const content = fs.readFileSync(fullPath, 'utf-8');
        expect(content).not.toContain('192.155.92.123'); // Production broker IP must not be in client code
        expect(content).not.toContain('mqtt://');
        expect(content).not.toContain('AUTH_TOKEN_PEPPER');
      }
    }
  });

  it('verifies future-tier commands report NOT IMPLEMENTED and exit non-zero (Exit Code 1)', () => {
    const runnerPath = path.resolve(__dirname, '../../scripts/runner.js');

    const futureCommands = [
      'test:integration',
      'test:e2e',
      'test:visual',
      'test:load',
      'test:security',
      'test:hardware',
      'db:migrate',
      'db:seed:test',
    ];

    for (const cmd of futureCommands) {
      const result = spawnSync('node', [runnerPath, cmd], {
        encoding: 'utf-8',
      });

      expect(result.status, `Command ${cmd} must exit with code 1`).toBe(1);
      const output = (result.stderr || '') + (result.stdout || '');
      expect(output).toContain('NOT IMPLEMENTED');
    }
  });

  it('strictly fails production web build when VITE_API_BASE_URL is localhost or HTTP (T28)', () => {
    const webDir = path.resolve(__dirname, '../../apps/web');
    const result = spawnSync('npx.cmd vite build --mode production', {
      cwd: webDir,
      encoding: 'utf-8',
      shell: true,
      env: {
        ...process.env,
        VITE_API_BASE_URL: 'http://localhost:3001',
      },
    });

    expect(result.status, 'Production build with localhost must fail').not.toBe(0);
    const output = (result.stderr || '') + (result.stdout || '');
    expect(output).toContain('SECURITY AUDIT FAILURE');
  });

  it('confirms production web build assets contain zero credentials or broker addresses', () => {
    const distAssetsDir = path.resolve(__dirname, '../../apps/web/dist/assets');
    if (!fs.existsSync(distAssetsDir)) return; // Only if dist already built

    const files = fs.readdirSync(distAssetsDir).filter((f) => f.endsWith('.js'));
    for (const f of files) {
      const content = fs.readFileSync(path.join(distAssetsDir, f), 'utf-8');
      expect(content).not.toContain('192.155.92.123');
      expect(content).not.toContain('AUTH_TOKEN_PEPPER');
      expect(content).not.toContain('MQTT_PASSWORD');
    }
  });
});
