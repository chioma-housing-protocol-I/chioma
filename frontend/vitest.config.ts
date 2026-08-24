import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['**/__tests__/**/*.test.{ts,tsx}'],
    setupFiles: ['test/setup.ts', 'test/setup-tests.ts'],
    testTimeout: 20000,
    hookTimeout: 20000,
    fileParallelism: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html', 'json-summary'],
      include: ['components/**/*.{ts,tsx}'],
      exclude: ['**/__tests__/**', '**/*.d.ts', '**/*.stories.{ts,tsx}'],
      thresholds: {
        lines: 30,
        branches: 25,
        functions: 25,
        statements: 30,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
