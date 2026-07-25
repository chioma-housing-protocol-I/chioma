import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['**/__tests__/**/*.test.{ts,tsx}'],
    setupFiles: ['test/setup.ts', 'test/setup-tests.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include: [
        'components/auth/**/*.{ts,tsx}',
        'components/reviews/**/*.{ts,tsx}',
        'components/forms/**/*.{ts,tsx}',
        'components/accessibility/**/*.{ts,tsx}',
      ],
      thresholds: {
        lines: 85,
        branches: 85,
        functions: 85,
        statements: 85,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
