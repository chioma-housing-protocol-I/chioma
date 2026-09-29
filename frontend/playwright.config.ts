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
    // The gallery's transactions table formats its mock timestamps in the
    // browser's local timezone (correct, real product behavior — users see
    // their own local time). Without pinning it here, the screenshot's
    // displayed times — and therefore the baseline PNG — depend on whatever
    // timezone the machine running the test happens to be in, which is
    // exactly what made this suite non-deterministic between local runs and
    // GitHub Actions (UTC).
    timezoneId: 'UTC',
  },
  webServer: {
    // Matches the project's `dev` script: Turbopack has known issues with
    // the custom `webpack()` config in next.config.ts.
    command: `pnpm exec next dev --webpack --port ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    // TZ here must match `use.timezoneId` above. The server process's own
    // timezone isn't affected by Playwright's browser-context timezoneId —
    // only the client is — so without this, SSR renders local-timezone
    // timestamps while the browser hydrates with UTC ones, producing a
    // genuine React hydration mismatch (visible as an error toast) on any
    // page that formats a date/time server-side, like the gallery's
    // transactions table.
    env: { TZ: 'UTC' },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
