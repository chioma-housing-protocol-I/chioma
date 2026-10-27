import { defineConfig, devices } from '@playwright/test';

const PORT = 3101;
const BASE_URL = `http://127.0.0.1:${PORT}`;

/**
 * Behavioral end-to-end config (#2037, #2041). Separate from
 * `playwright.config.ts` (visual regression / screenshot diffing) on
 * purpose: a visual diff and a behavioral failure have different causes
 * and different triage, so mixing the two into one config/testDir would
 * make a screenshot change and an actual broken flow look like the same
 * kind of failure. Runs on a different port so both configs' webServers
 * can run concurrently without a port clash in CI.
 */
export default defineConfig({
  testDir: './__tests__/e2e-behavioral',
  testMatch: '**/*.e2e.spec.ts',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  // `next dev` compiles each route on its first visit; under CI or a
  // resource-constrained machine, that first-compile latency can race a
  // test's own timeouts, especially across a fast sequence of distinct
  // routes. One retry absorbs that without masking a genuinely broken flow
  // (a flow that's actually broken fails the same way on retry too).
  retries: 1,
  workers: 1,
  reporter: [
    ['html', { outputFolder: 'playwright-e2e-report', open: 'never' }],
    ['list'],
  ],
  outputDir: 'test-results-e2e',
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: `pnpm exec next dev --webpack --port ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 7'] },
    },
    {
      name: 'desktop-chrome',
      use: { ...devices['Desktop Chrome'], hasTouch: true },
    },
  ],
});
