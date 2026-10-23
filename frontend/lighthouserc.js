/**
 * Lighthouse CI performance budget (#2079).
 *
 * Runs against a production build (`next build && next start`), never
 * `next dev` — dev mode disables most of Next's production optimizations
 * (minification, tree-shaking is partial, no React production profiling
 * build), so it would fail every budget here regardless of real
 * performance and give no useful signal.
 *
 * Usage:
 *   pnpm run build && pnpm run perf:budget
 *
 * The routes list intentionally matches `bundle-budgets.json`'s route set,
 * so the two budgets (JS bundle size, Core Web Vitals) are reviewed
 * together rather than drifting independently.
 */
module.exports = {
  ci: {
    collect: {
      startServerCommand: 'pnpm run start -- -p 3100',
      startServerReadyPattern: 'Ready in',
      startServerReadyTimeout: 30000,
      url: [
        'http://127.0.0.1:3100/',
        'http://127.0.0.1:3100/properties',
        'http://127.0.0.1:3100/login',
      ],
      numberOfRuns: 3,
      settings: {
        preset: 'desktop',
      },
    },
    assert: {
      assertions: {
        // #2079's explicit budget: FCP < 2s, LCP < 2.5s, CLS < 0.1.
        'first-contentful-paint': ['error', { maxNumericValue: 2000 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
      },
    },
    upload: {
      target: 'filesystem',
      outputDir: './.lighthouseci',
    },
  },
};
