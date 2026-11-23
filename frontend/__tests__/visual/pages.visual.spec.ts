import { test, expect, type Page } from '@playwright/test';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Injected into every page before navigation.
 *
 * 1. Stubs the service-worker registration so the PwaController's error toast
 *    never fires (same approach used in component-gallery.visual.spec.ts).
 * 2. Freezes CSS animations/transitions so screenshots are stable and do not
 *    capture a mid-animation frame.
 */
async function applyPageStabilisers(page: Page) {
  await page.addInitScript(() => {
    // --- service worker stub ---
    if ('serviceWorker' in navigator) {
      Object.defineProperty(navigator.serviceWorker, 'register', {
        configurable: true,
        value: () =>
          Promise.resolve({ waiting: null, addEventListener: () => {} }),
      });
    }

    // --- freeze animations ---
    const style = document.createElement('style');
    style.textContent = `
      *, *::before, *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition-duration: 0s !important;
        transition-delay: 0s !important;
      }
    `;
    document.head.appendChild(style);
  });
}

/**
 * Waits for web fonts and the Next.js dev-mode "Compiling…" overlay to
 * disappear, then gives the layout a short settle period.
 */
async function waitForPageReady(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  await page
    .getByText('Compiling', { exact: false })
    .waitFor({ state: 'hidden', timeout: 30_000 })
    .catch(() => {});
  await page.waitForTimeout(500);
}

// ---------------------------------------------------------------------------
// Home page
// ---------------------------------------------------------------------------

test.describe('home page', () => {
  test('above-the-fold hero matches the baseline', async ({ page }) => {
    await applyPageStabilisers(page);
    await page.goto('/');
    await waitForPageReady(page);

    // Clip to the hero section only — the rest of the landing page is
    // dynamically imported and may still be loading, and the Navbar carries
    // session-dependent UI that would create spurious diffs.
    const hero = page.locator('section').first();
    await hero.waitFor({ state: 'visible' });
    await expect(hero).toHaveScreenshot('home-hero.png');
  });

  test('stats section matches the baseline', async ({ page }) => {
    await applyPageStabilisers(page);
    await page.goto('/');
    await waitForPageReady(page);

    // Stats renders immediately after the hero in the same SSR bundle.
    const stats = page.locator('section').nth(1);
    await stats.waitFor({ state: 'visible' });
    await expect(stats).toHaveScreenshot('home-stats.png');
  });
});

// ---------------------------------------------------------------------------
// Property detail page  (/properties/1)
// ---------------------------------------------------------------------------
//
// The detail page is a Next.js Server Component backed by a local mock
// function (no network calls), so no API route stubbing is needed.
// We use property id "1" which is defined in the page's own mock data.

test.describe('property detail page', () => {
  test.beforeEach(async ({ page }) => {
    await applyPageStabilisers(page);
    await page.goto('/properties/1');
    await waitForPageReady(page);
    // The image gallery uses next/image with external Unsplash URLs; mark
    // images as loaded so layout does not shift after the screenshot starts.
    await page.evaluate(() => {
      document.querySelectorAll('img').forEach((img) => {
        if (!img.complete) {
          img.src =
            'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
        }
      });
    });
  });

  test('property header and image gallery match the baseline', async ({
    page,
  }) => {
    // The page header (title + location + gallery) is the first meaningful
    // section inside <main>.
    const header = page.locator('main > div > div').first();
    await header.waitFor({ state: 'visible' });
    await expect(header).toHaveScreenshot('property-detail-header.png');
  });

  test('pricing sidebar CTA matches the baseline', async ({ page }) => {
    // Right-hand sticky booking card (lg:col-span-4).
    const sidebar = page.locator('[class*="sticky"]').first();
    await sidebar.waitFor({ state: 'visible' });
    await expect(sidebar).toHaveScreenshot('property-detail-sidebar.png');
  });
});

// ---------------------------------------------------------------------------
// Properties listing page  (/properties)
// ---------------------------------------------------------------------------
//
// This page is a client component that fetches from the backend via
// TanStack Query.  We intercept the API request before navigation so the
// grid always renders a fixed, deterministic set of cards.

const MOCK_PROPERTIES_RESPONSE = {
  data: [
    {
      id: '1',
      title: 'Luxury 2-Bed Apartment',
      price: 2500,
      currency: 'USDC',
      location: 'Victoria Island, Lagos',
      type: 'apartment',
      status: 'available',
      images: [
        'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&h=600&fit=crop',
      ],
      bedrooms: 2,
      bathrooms: 2,
      area: 1200,
      latitude: 6.4281,
      longitude: 3.4219,
      amenities: ['WiFi', 'Pool', 'Security'],
      ownerId: 'u1',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    },
    {
      id: '2',
      title: 'Modern Loft in Lekki',
      price: 3800,
      currency: 'USDC',
      location: 'Lekki Phase 1, Lagos',
      type: 'apartment',
      status: 'rented',
      images: [
        'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&h=600&fit=crop',
      ],
      bedrooms: 1,
      bathrooms: 1,
      area: 850,
      latitude: 6.4549,
      longitude: 3.5695,
      amenities: ['Elevator', 'Smart Home'],
      ownerId: 'u2',
      createdAt: '2024-01-02T00:00:00.000Z',
      updatedAt: '2024-01-02T00:00:00.000Z',
    },
    {
      id: '3',
      title: 'Serviced Studio Flat',
      price: 1500,
      currency: 'USDC',
      location: 'Ikoyi, Lagos',
      type: 'apartment',
      status: 'available',
      images: [
        'https://images.unsplash.com/photo-1493857671505-72967e2e2760?w=800&h=600&fit=crop',
      ],
      bedrooms: 1,
      bathrooms: 1,
      area: 500,
      latitude: 6.4486,
      longitude: 3.4306,
      amenities: ['WiFi', 'Housekeeping'],
      ownerId: 'u3',
      createdAt: '2024-01-03T00:00:00.000Z',
      updatedAt: '2024-01-03T00:00:00.000Z',
    },
  ],
  total: 3,
  page: 1,
  limit: 12,
  totalPages: 1,
};

test.describe('properties listing page', () => {
  test.beforeEach(async ({ page }) => {
    // Stub every request that matches the properties API before the page
    // loads so TanStack Query never touches the real backend.
    await page.route('**/api/properties**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_PROPERTIES_RESPONSE),
      }),
    );

    await applyPageStabilisers(page);
    await page.goto('/properties');
    await waitForPageReady(page);

    // Wait for the property grid to appear (either real cards or the
    // loading skeleton; we wait for the real cards specifically).
    await page.getByTestId('property-grid').waitFor({ state: 'visible' });

    // Stub images to avoid layout shifts from slow external sources.
    await page.evaluate(() => {
      document.querySelectorAll('img').forEach((img) => {
        if (!img.complete) {
          img.src =
            'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
        }
      });
    });
  });

  test('search and filter header matches the baseline', async ({ page }) => {
    const header = page.locator('header').first();
    await expect(header).toHaveScreenshot('properties-header.png');
  });

  test('property grid matches the baseline', async ({ page }) => {
    const grid = page.getByTestId('property-grid');
    await expect(grid).toHaveScreenshot('properties-grid.png');
  });

  test('view toggle matches the baseline', async ({ page }) => {
    const toggle = page.getByTestId('view-toggle');
    await expect(toggle).toHaveScreenshot('properties-view-toggle.png');
  });
});

// ---------------------------------------------------------------------------
// Booking page  (/stays/book/1)
// ---------------------------------------------------------------------------
//
// The booking page is a client component that calls useProperty(propertyId).
// We stub that API request so the component renders with known price data
// and capture each of the four wizard steps.

const MOCK_BOOKING_PROPERTY = {
  id: '1',
  title: 'Luxury 2-Bed Apartment',
  price: 2500,
  currency: 'USDC',
  location: 'Victoria Island, Lagos',
  type: 'apartment',
  status: 'available',
  images: [
    'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&h=600&fit=crop',
  ],
  bedrooms: 2,
  bathrooms: 2,
  area: 1200,
  amenities: ['WiFi', 'Pool', 'Security'],
  ownerId: 'u1',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

test.describe('booking page', () => {
  async function gotoBooking(page: Page) {
    await page.route('**/api/properties/1**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_BOOKING_PROPERTY),
      }),
    );
    await page.route('**/api/properties?**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_PROPERTIES_RESPONSE),
      }),
    );

    await applyPageStabilisers(page);
    await page.goto('/stays/book/1');
    await waitForPageReady(page);
  }

  test('step 1 — dates card matches the baseline', async ({ page }) => {
    await gotoBooking(page);

    // The wizard card wraps all four steps.
    const card = page.locator('.backdrop-blur-xl').first();
    await card.waitFor({ state: 'visible' });
    await expect(card).toHaveScreenshot('booking-step-1.png');
  });

  test('step indicator matches the baseline', async ({ page }) => {
    await gotoBooking(page);

    // The step breadcrumb sits above the card.
    const indicator = page.locator('.max-w-lg > div').nth(1);
    await indicator.waitFor({ state: 'visible' });
    await expect(indicator).toHaveScreenshot('booking-step-indicator.png');
  });

  test('full booking page matches the baseline', async ({ page }) => {
    await gotoBooking(page);

    // Full-page screenshot scoped to the booking container so the
    // gradient background does not add noise from viewport size changes.
    const container = page.locator('.max-w-lg');
    await container.waitFor({ state: 'visible' });
    await expect(container).toHaveScreenshot('booking-full.png');
  });
});
