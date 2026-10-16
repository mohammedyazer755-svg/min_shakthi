import { describe, it, expect } from 'vitest';
import { loadAndValidateServerEnv } from './env.js';

describe('Server Environment Configuration Loader', () => {
  it('loads valid development configuration with defaults', () => {
    const raw = {
      NODE_ENV: 'development',
      MQTT_URL: 'mqtt://localhost:1883',
      MQTT_TOPIC: 'swiftpower',
    };
    const env = loadAndValidateServerEnv(raw);
    expect(env.PORT).toBe(3001);
    expect(env.MQTT_TOPIC).toBe('swiftpower');
    expect(env.COOKIE_SECURE).toBe(true);
  });

  it('fails with actionable message when required production variables are missing', () => {
    const badProdRaw = {
      NODE_ENV: 'production',
      MQTT_URL: 'mqtt://192.155.92.123:1883',
      MQTT_TOPIC: 'swiftpower',
    };

    expect(() => loadAndValidateServerEnv(badProdRaw)).toThrowError(
      /CRITICAL ENVIRONMENT CONFIGURATION ERROR/
    );
  });

  it('fails with actionable message and rejects localhost in production', () => {
    const localhostProdRaw = {
      NODE_ENV: 'production',
      MQTT_URL: 'mqtt://192.155.92.123:1883',
      MQTT_TOPIC: 'swiftpower',
      DATABASE_URL: 'postgres://valid_user:secret_password@db.provider.internal:5432/db',
      AUTH_TOKEN_PEPPER: 'secret_pepper_12345678',
      PUBLIC_API_ORIGIN: 'http://localhost:3001', // ILLEGAL
    };

    let thrownError: Error | null = null;
    try {
      loadAndValidateServerEnv(localhostProdRaw);
    } catch (err) {
      thrownError = err as Error;
    }

    expect(thrownError).not.toBeNull();
    expect(thrownError?.message).toContain('PUBLIC_API_ORIGIN');
    // Verify no secrets leaked in error string
    expect(thrownError?.message).not.toContain('secret_password');
    expect(thrownError?.message).not.toContain('secret_pepper');
  });
});
