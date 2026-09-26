import { test, expect, type Page } from '@playwright/test';

/**
 * Visual regression coverage for the shared UI primitives and one
 * high-traffic composed view (the transactions table used on both the
 * tenant and landlord dashboards). Each assertion targets a single
 * `data-testid` region from `/dev/visual-gallery` so an unrelated change
 * elsewhere on the page can't cause a spurious diff.
 */

async function gotoGallery(page: Page) {
  // PwaController (mounted globally in RootLayoutClient, so it runs on
  // every page including this one) registers a service worker on mount and
  // shows an error toast if that fails — which it reliably does under
  // `next dev`, where /sw.js isn't served. That toast is unrelated to
  // whatever this test is actually asserting, so stub registration to
  // resolve instead of chasing the async toast's timing.
  await page.addInitScript(() => {
    if ('serviceWorker' in navigator) {
      Object.defineProperty(navigator.serviceWorker, 'register', {
        configurable: true,
        value: () =>
          Promise.resolve({
            waiting: null,
            addEventListener: () => {},
          }),
      });
    }
  });

  await page.goto('/dev/visual-gallery');
  // Avoid flakiness from text reflow while web fonts are still loading.
  await page.evaluate(() => document.fonts.ready);
  // On a cold `next dev` server, the first request for this route can land
  // mid-compile, and Next's dev "Compiling..." build-activity overlay
  // renders on top of the page — this overlay is unrelated to the gallery
  // itself, so it shouldn't be baked into a baseline. A locator with zero
  // matches already counts as "hidden", so this resolves immediately once
  // the route is warm.
  await page
    .getByText('Compiling', { exact: false })
    .waitFor({ state: 'hidden', timeout: 30_000 })
    .catch(() => {});
  // Next's dev-mode build-activity indicator (the small badge in the
  // bottom-left corner) settles into its resting state asynchronously
  // after navigation; toHaveScreenshot's own stability polling starts
  // immediately and can lock in a mid-transition frame if nothing else has
  // given it time to finish first.
  await page.waitForTimeout(500);
}

test.describe('component gallery', () => {
  test.beforeEach(async ({ page }) => {
    await gotoGallery(page);
  });

  const primitives = [
    ['gallery-buttons', 'buttons'],
    ['gallery-badges', 'badges'],
    ['gallery-alerts', 'alerts'],
    ['gallery-form-fields', 'form-fields'],
    ['gallery-table', 'table'],
    ['gallery-empty-state', 'empty-state'],
    ['gallery-pagination', 'pagination'],
  ] as const;

  for (const [testId, name] of primitives) {
    test(`${name} match the baseline`, async ({ page }) => {
      await expect(page.getByTestId(testId)).toHaveScreenshot(`${name}.png`);
    });
  }
});

test.describe('composed views', () => {
  test.beforeEach(async ({ page }) => {
    await gotoGallery(page);
  });

  test('transactions table matches the baseline', async ({ page }) => {
    const table = page.getByTestId('gallery-transactions-table');
    await table.scrollIntoViewIfNeeded();
    await expect(table).toHaveScreenshot('transactions-table.png');
  });
});
