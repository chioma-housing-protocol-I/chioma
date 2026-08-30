import { defineConfig, devices } from '@playwright/test';

const PORT = 3100;
const BASE_URL = `http://127.0.0.1:${PORT}`;

/**
 * Visual regression config. Screenshots are taken against a real `next dev`
 * server (via `webServer`) so components render with actual Tailwind output,
 * fonts, and layout — not a static HTML fixture.
 */
export default defineConfig({
  testDir: './__tests__/visual',
  testMatch: '**/*.visual.spec.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['list'],
  ],
  outputDir: 'test-results',
  expect: {
    // Small tolerance for anti-aliasing/font-rendering differences between
    // machines; anything larger should fail as a real visual regression.
    toHaveScreenshot: { maxDiffPixelRatio: 0.02 },
  },
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    // Matches the project's `dev` script: Turbopack has known issues with
    // the custom `webpack()` config in next.config.ts.
    command: `pnpm exec next dev --webpack --port ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
