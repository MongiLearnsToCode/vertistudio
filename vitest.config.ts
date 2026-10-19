import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  esbuild: { jsx: 'automatic' },
  resolve: {
    alias: {
      '@shared': path.resolve('./src/shared'),
      '@renderer': path.resolve('./src/renderer'),
      '@features': path.resolve('./src/features'),
      '@main': path.resolve('./src/main'),
      '@logging': path.resolve('./src/logging'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/__tests__/**/*.test.{ts,tsx}', 'scripts/**/__tests__/**/*.test.js'],
  },
});
