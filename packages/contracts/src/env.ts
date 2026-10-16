import { z } from 'zod';

/**
 * Validates a public production URL (e.g., VITE_API_BASE_URL or PUBLIC_API_ORIGIN).
 * Rejects localhost, 127.0.0.1, 0.0.0.0, non-HTTPS protocols, or embedded credentials.
 */
export function validateProductionUrl(urlStr: string | undefined): {
  valid: boolean;
  reason?: string;
} {
  if (!urlStr || urlStr.trim() === '') {
    return { valid: false, reason: 'Production URL is required and cannot be empty.' };
  }

  let parsed: URL;
  try {
    parsed = new URL(urlStr);
  } catch {
    return { valid: false, reason: `Invalid URL format: "${urlStr}".` };
  }

  if (parsed.protocol !== 'https:') {
    return {
      valid: false,
      reason: `Production URL must use "https:" protocol, got "${parsed.protocol}". Plain HTTP is strictly forbidden in production.`,
    };
  }

  const hostname = parsed.hostname.toLowerCase();
  const forbiddenHosts = ['localhost', '127.0.0.1', '::1', '0.0.0.0', 'test.localhost'];
  if (forbiddenHosts.includes(hostname) || hostname.endsWith('.localhost')) {
    return {
      valid: false,
      reason: `Production URL hostname cannot be localhost or loopback address ("${hostname}").`,
    };
  }

  if (parsed.username || parsed.password) {
    return {
      valid: false,
      reason: 'Production URL must not contain embedded username or password credentials.',
    };
  }

  return { valid: true };
}

export const ServerEnvSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z
      .string()
      .transform((val) => parseInt(val, 10))
      .pipe(z.number().int().positive())
      .default('3001'),
    MQTT_URL: z.string().min(1, 'MQTT_URL is required'),
    MQTT_TOPIC: z.string().min(1, 'MQTT_TOPIC is required').default('swiftpower'),
    MQTT_USERNAME: z.string().optional(),
    MQTT_PASSWORD: z.string().optional(),
    MQTT_CLIENT_ID: z.string().optional(),
    DATABASE_URL: z.string().optional(),
    ALLOWED_ORIGINS: z.string().optional(),
    AUTH_TOKEN_PEPPER: z.string().optional(),
    PUBLIC_API_ORIGIN: z.string().optional(),
    COOKIE_SECURE: z
      .string()
      .transform((val) => val === 'true')
      .default('true'),
    COOKIE_SAME_SITE: z.enum(['lax', 'strict', 'none']).default('lax'),
    SPOOL_DIR: z.string().default('/var/data/minsakthi-spool'),
    SPOOL_MAX_BYTES: z
      .string()
      .transform((val) => parseInt(val, 10))
      .pipe(z.number().int().positive())
      .default('1073741824'),
  })
  .superRefine((data, ctx) => {
    if (data.NODE_ENV === 'production') {
      if (!data.DATABASE_URL || data.DATABASE_URL.trim() === '') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['DATABASE_URL'],
          message: 'DATABASE_URL is required in production mode.',
        });
      }
      if (!data.AUTH_TOKEN_PEPPER || data.AUTH_TOKEN_PEPPER.trim() === '') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['AUTH_TOKEN_PEPPER'],
          message: 'AUTH_TOKEN_PEPPER is required in production mode.',
        });
      }
      const originCheck = validateProductionUrl(data.PUBLIC_API_ORIGIN);
      if (!originCheck.valid) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['PUBLIC_API_ORIGIN'],
          message: originCheck.reason ?? 'Invalid PUBLIC_API_ORIGIN in production.',
        });
      }
    }
  });

export type ServerEnv = z.infer<typeof ServerEnvSchema>;

export const WebEnvSchema = z
  .object({
    MODE: z.string().optional(),
    PROD: z.boolean().optional(),
    DEV: z.boolean().optional(),
    VITE_API_BASE_URL: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.PROD) {
      const check = validateProductionUrl(data.VITE_API_BASE_URL);
      if (!check.valid) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['VITE_API_BASE_URL'],
          message: check.reason ?? 'Invalid VITE_API_BASE_URL in production build.',
        });
      }
    }
  });

export type WebEnv = z.infer<typeof WebEnvSchema>;
