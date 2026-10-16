import { ServerEnvSchema, type ServerEnv } from '@minsakthi/contracts';
import dotenv from 'dotenv';

// Load local environment file if present (TEST ONLY / dev)
dotenv.config();

export function loadAndValidateServerEnv(rawEnv: Record<string, string | undefined> = process.env): ServerEnv {
  const result = ServerEnvSchema.safeParse(rawEnv);

  if (!result.success) {
    const errorDetails = result.error.errors.map((err) => {
      const field = err.path.join('.');
      return `  - ${field}: ${err.message}`;
    });

    const errorMessage = [
      'CRITICAL ENVIRONMENT CONFIGURATION ERROR:',
      'Server failed to start due to invalid or missing configuration parameters.',
      ...errorDetails,
      'Ensure all required environment variables are set via the provider secret manager.',
      'Secrets must NEVER be committed or logged.',
    ].join('\n');

    throw new Error(errorMessage);
  }

  return result.data;
}
