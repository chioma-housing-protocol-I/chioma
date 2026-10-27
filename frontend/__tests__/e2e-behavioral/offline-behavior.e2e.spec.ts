/**
 * Offline behavior E2E (#2041). Tests the app's real, observable response
 * to a lost network connection, using Playwright's network-level offline
 * simulation (`context.setOffline`) rather than the actual service worker:
 * `public/sw.js` is not served under `next dev` (confirmed in
 * `__tests__/visual/component-gallery.visual.spec.ts`'s own comment), so
 * registering it and exercising real SW cache hit/miss behavior is covered
 * separately and more reliably in `__tests__/public/sw.test.ts`, which
 * loads the real file into a sandboxed Service Worker scope. This test
 * covers what the sw.js unit test can't: what the *app* actually shows a
 * user when a request fails, independent of whether a service worker is
 * present.
 */
import { test, expect } from '@playwright/test';

test.describe('Offline behavior', () => {
  test('the /offline page switches to "offline" the moment the connection drops, via the window "offline" event', async ({
    page,
    context,
  }) => {
    // Load the page online first (there is no service worker under `next
    // dev` to serve it from cache, so a cold navigation while already
    // offline can't be tested against a dev server — see the top-of-file
    // note); then drop the connection, which is the realistic "user is
    // already on the page and loses signal" scenario, and is what actually
    // exercises the window 'offline' listener this page registers.
    // First navigation to this route compiles it under `next dev`; wait
    // for that settle before asserting, same rationale as
    // mobile-booking.e2e.spec.ts's beforeEach warmup.
    await page.goto('/offline');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText("We can't reach Chioma")).toBeVisible();

    await context.setOffline(true);

    await expect(page.getByText("You're offline")).toBeVisible();

    await context.setOffline(false);
  });

  test('the /offline page reaches a server-error state (not stuck "checking") when online but the API is unreachable', async ({
    page,
  }) => {
    // 'failed' (a generic network failure) rather than
    // 'internetdisconnected' — the latter actually flips the browser's own
    // navigator.onLine to false as a side effect in Chromium, which would
    // make this test exercise the "offline" branch instead of the
    // "online but API unreachable" branch it's meant to cover.
    await page.route('**/health', (route) => route.abort('failed'));

    await page.goto('/offline');

    await expect(page.getByText("We can't reach Chioma")).toBeVisible();
  });

  test('a booking API call made while offline fails visibly instead of hanging silently', async ({
    page,
    context,
  }) => {
    await page.route('**/api/properties/prop-offline-test', (route) =>
      route.fulfill({
        json: {
          id: 'prop-offline-test',
          title: 'Test property',
          description: '',
          address: '1 Test St',
          city: 'Lagos',
          state: 'Lagos',
          country: 'Nigeria',
          price: 100,
          currency: 'USD',
          bedrooms: 1,
          bathrooms: 1,
          area: 40,
          type: 'apartment',
          status: 'published',
          images: [],
          amenities: [],
          ownerId: 'owner-1',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      }),
    );
    await page.route(
      '**/api/properties/prop-offline-test/availability**',
      (route) => route.fulfill({ json: [] }),
    );

    await page.goto('/stays/book/prop-offline-test');

    // Now go offline for the submission itself: setOffline drops every
    // request at the browser level, so the earlier route mocks for the
    // page load no longer apply once this is set, matching what the
    // user's real device would do.
    await context.setOffline(true);

    const dateInputs = page.locator('input[type="date"]');
    await dateInputs.nth(0).fill('2027-07-01');
    await dateInputs.nth(1).fill('2027-07-05');
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByText('Credit / Debit Card').click();
    await page.getByRole('button', { name: 'Confirm Booking' }).click();

    // The submit flow's catch block shows an error toast rather than
    // leaving the user on a frozen "Confirming..." button forever.
    await expect(page.getByText(/something went wrong/i)).toBeVisible();

    await context.setOffline(false);
  });
});
