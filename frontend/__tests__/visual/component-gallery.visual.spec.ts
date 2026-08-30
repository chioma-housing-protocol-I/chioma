import { test, expect } from '@playwright/test';

/**
 * Visual regression coverage for the shared UI primitives and one
 * high-traffic composed view (the transactions table used on both the
 * tenant and landlord dashboards). Each assertion targets a single
 * `data-testid` region from `/dev/visual-gallery` so an unrelated change
 * elsewhere on the page can't cause a spurious diff.
 */
test.describe('component gallery', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dev/visual-gallery');
    // Avoid flakiness from text reflow while web fonts are still loading.
    await page.evaluate(() => document.fonts.ready);
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
    await page.goto('/dev/visual-gallery');
    // Avoid flakiness from text reflow while web fonts are still loading.
    await page.evaluate(() => document.fonts.ready);
  });

  test('transactions table matches the baseline', async ({ page }) => {
    await expect(
      page.getByTestId('gallery-transactions-table'),
    ).toHaveScreenshot('transactions-table.png');
  });
});
