import { defineConfig } from 'vitest/config';
import * as path from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@minsakthi/contracts': path.resolve(__dirname, 'packages/contracts/src/index.ts'),
      '@minsakthi/protocol': path.resolve(__dirname, 'packages/protocol/src/index.ts'),
      '@minsakthi/db': path.resolve(__dirname, 'packages/db/src/index.ts'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: [
      'packages/*/tests/**/*.test.ts',
      'apps/*/src/**/*.test.ts',
      'tests/unit/**/*.test.ts',
      'tests/integration/**/*.test.ts',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
});
