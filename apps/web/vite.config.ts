import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import * as path from 'node:path';
import { validateProductionUrl } from '../../packages/contracts/src/index.ts';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  // In production builds, validate VITE_API_BASE_URL if set
  if (mode === 'production') {
    const apiUrl = env['VITE_API_BASE_URL'] || process.env['VITE_API_BASE_URL'];
    if (apiUrl) {
      const validation = validateProductionUrl(apiUrl);
      if (!validation.valid) {
        throw new Error(
          `[SECURITY AUDIT FAILURE] VITE_API_BASE_URL violates production URL contract: ${validation.reason}`
        );
      }
    }
  }

  return {
    resolve: {
      alias: {
        '@minsakthi/contracts': path.resolve(__dirname, '../../packages/contracts/src/index.ts'),
      },
    },
    plugins: [react()],
    server: {
      port: 5173,
      strictPort: true,
    },
    build: {
      outDir: 'dist',
      sourcemap: true,
    },
  };
});
