import { describe, it, expect } from 'vitest';
import { validateProductionUrl, ServerEnvSchema } from '../src/env.js';

describe('Production URL and Environment Validation Contracts', () => {
  it('strictly rejects empty or undefined production URL', () => {
    expect(validateProductionUrl(undefined).valid).toBe(false);
    expect(validateProductionUrl('').valid).toBe(false);
    expect(validateProductionUrl('   ').valid).toBe(false);
  });

  it('strictly rejects plain HTTP URLs in production (no non-HTTPS)', () => {
    const res = validateProductionUrl('http://api.minsakthi.com');
    expect(res.valid).toBe(false);
    expect(res.reason).toContain('Plain HTTP is strictly forbidden');
  });

  it('strictly rejects localhost and loopback hostnames in production', () => {
    expect(validateProductionUrl('https://localhost').valid).toBe(false);
    expect(validateProductionUrl('https://localhost:3001').valid).toBe(false);
    expect(validateProductionUrl('https://127.0.0.1:3001').valid).toBe(false);
    expect(validateProductionUrl('https://0.0.0.0').valid).toBe(false);
    expect(validateProductionUrl('https://sub.localhost').valid).toBe(false);
  });

  it('strictly rejects embedded credentials in production URL', () => {
    const res = validateProductionUrl('https://user:password@api.minsakthi.com');
    expect(res.valid).toBe(false);
    expect(res.reason).toContain('must not contain embedded username or password');
  });

  it('accepts valid production HTTPS URLs', () => {
    expect(validateProductionUrl('https://api.minsakthi.com').valid).toBe(true);
    expect(validateProductionUrl('https://minsakthi-api.onrender.com').valid).toBe(true);
  });

  it('fails ServerEnvSchema validation when production mode has localhost origin', () => {
    const badProdEnv = {
      NODE_ENV: 'production',
      PORT: '3001',
      MQTT_URL: 'mqtt://192.155.92.123:1883',
      MQTT_TOPIC: 'swiftpower',
      DATABASE_URL: 'postgres://user:pass@db.example.com/db',
      AUTH_TOKEN_PEPPER: 'supersecretpepperstring12345678',
      PUBLIC_API_ORIGIN: 'http://localhost:3001', // ILLEGAL in prod
    };

    const res = ServerEnvSchema.safeParse(badProdEnv);
    expect(res.success).toBe(false);
    if (!res.success) {
      const err = res.error.errors.find((e) => e.path.includes('PUBLIC_API_ORIGIN'));
      expect(err).toBeDefined();
    }
  });

  it('fails ServerEnvSchema validation when production mode is missing DATABASE_URL or AUTH_TOKEN_PEPPER', () => {
    const badProdEnv = {
      NODE_ENV: 'production',
      PORT: '3001',
      MQTT_URL: 'mqtt://192.155.92.123:1883',
      MQTT_TOPIC: 'swiftpower',
      PUBLIC_API_ORIGIN: 'https://api.minsakthi.com',
    };

    const res = ServerEnvSchema.safeParse(badProdEnv);
    expect(res.success).toBe(false);
    if (!res.success) {
      const paths = res.error.errors.map((e) => e.path[0]);
      expect(paths).toContain('DATABASE_URL');
      expect(paths).toContain('AUTH_TOKEN_PEPPER');
    }
  });
});
