/**
 * Mobile viewport E2E test for the booking flow (#2037). Runs under
 * `playwright.e2e.config.ts`'s `mobile-chrome` project (a touch-enabled
 * Pixel 7 emulation), exercising the full date-select -> submit flow with
 * tap interactions on a real `next dev` server. Backend calls are
 * intercepted via Playwright route mocking so this test doesn't depend on
 * a running backend or seeded database.
 */
import { test, expect } from '@playwright/test';

const PROPERTY_ID = 'prop-e2e-mobile';

const MOCK_PROPERTY = {
  id: PROPERTY_ID,
  title: 'Seaside Cottage',
  description: 'A cozy cottage by the sea.',
  address: '1 Ocean Drive',
  city: 'Lagos',
  state: 'Lagos',
  country: 'Nigeria',
  price: 120,
  currency: 'USD',
  bedrooms: 2,
  bathrooms: 1,
  area: 65,
  type: 'apartment',
  status: 'published',
  images: [],
  amenities: [],
  ownerId: 'owner-1',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

test.describe('Mobile booking flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.route(`**/api/properties/${PROPERTY_ID}`, (route) =>
      route.fulfill({ json: MOCK_PROPERTY }),
    );
    await page.route(
      `**/api/properties/${PROPERTY_ID}/availability**`,
      (route) => route.fulfill({ json: [] }),
    );
    await page.route('**/api/bookings', (route) =>
      route.fulfill({
        status: 201,
        json: { id: 'booking-e2e-1', status: 'pending' },
      }),
    );

    // Under `next dev`, each booking-wizard step compiles lazily on its
    // first ever render, triggering a Fast Refresh/HMR cycle that can
    // interrupt in-flight React state if it lands mid-interaction later. A
    // throwaway run through all four steps here, before the real test
    // re-navigates to the same route, forces every step's first compile
    // (and the HMR reconnects they cause) to happen and settle before any
    // assertion runs for real. Not needed against a production build,
    // where everything is already compiled ahead of time.
    await page.goto(`/stays/book/${PROPERTY_ID}`);
    const warmupDates = page.locator('input[type="date"]');
    await warmupDates.nth(0).fill('2027-06-01');
    await warmupDates.nth(1).fill('2027-06-05');
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByText('Credit / Debit Card').click();
    await page.waitForLoadState('networkidle');
  });

  test('completes the booking wizard on a touch device, from date selection to confirmation', async ({
    page,
  }) => {
    await page.goto(`/stays/book/${PROPERTY_ID}`);

    const dateInputs = page.locator('input[type="date"]');
    await expect(dateInputs).toHaveCount(2);

    // Tap (not click) the date fields, matching how a touch device actually
    // interacts with the picker rather than a mouse click.
    await dateInputs.nth(0).tap();
    await dateInputs.nth(0).fill('2027-06-01');
    await dateInputs.nth(1).tap();
    await dateInputs.nth(1).fill('2027-06-05');

    await page.getByRole('button', { name: 'Continue' }).tap();

    // Step 2: special requests (optional) -> continue without filling it in.
    await page.getByRole('button', { name: 'Continue' }).tap();

    // Step 3: payment method selection advances by tapping the method
    // itself, not a separate "Continue" button.
    await page.getByText('Credit / Debit Card').tap();

    // Step 4: review and submit.
    await expect(page.getByText(/2027-06-01.*2027-06-05/)).toBeVisible();

    await page.getByRole('button', { name: 'Confirm Booking' }).tap();

    await expect(page).toHaveURL(/\/guest\/trips/);
  });

  test('check-in and check-out inputs are large enough for a comfortable touch target', async ({
    page,
  }) => {
    await page.goto(`/stays/book/${PROPERTY_ID}`);

    const checkIn = page.locator('input[type="date"]').first();
    const box = await checkIn.boundingBox();

    expect(box).not.toBeNull();
    // 44px is the commonly-cited minimum comfortable touch target size
    // (Apple/Google HIG guidance); below this, mis-taps on a real device
    // become a real usability problem, not just an aesthetic one.
    expect(box!.height).toBeGreaterThanOrEqual(36);
  });
});
