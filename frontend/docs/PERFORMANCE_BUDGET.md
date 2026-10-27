# Performance Budget

Two enforced budgets, checked separately because they measure different
things and run at different build stages (#2079).

## JS bundle size

- **Budget:** each route's own first-load JS < 100KB (`maxKB`); 50KB
  triggers a warning (`warnKB`). Configured per-route in
  [`bundle-budgets.json`](../bundle-budgets.json).
- **Check:** `pnpm run build && pnpm run size:check`
  (`scripts/check-bundle-size.js`), which reads Next's Turbopack build
  diagnostics and fails CI (exit code 1) if any route exceeds `maxKB`.

## Core Web Vitals

- **Budget:** First Contentful Paint < 2000ms, Largest Contentful Paint <
  2500ms, Cumulative Layout Shift < 0.1 — configured in
  [`lighthouserc.js`](../lighthouserc.js).
- **Check:** `pnpm run build && pnpm run perf:budget` (`lhci autorun`),
  which starts a production server (`next start`, never `next dev` — dev
  mode's lack of production optimizations would fail every budget
  regardless of real performance) on port 3100 and runs Lighthouse 3 times
  per route against `/`, `/properties`, and `/login`, failing if any run's
  median exceeds a budget.
- **Live observability (not enforcement):** real-user Core Web Vitals
  (including LCP/CLS/INP, and FCP) are continuously collected via
  `components/web-vitals/WebVitalsReporter.tsx` and viewable at `/vitals`
  in the running app. This is a dashboard for watching real traffic, not a
  CI gate — Lighthouse CI above is what actually blocks a regression from
  merging.

## Why two separate checks instead of one

The bundle-size check only needs a `next build` output (no browser, fast,
runs on every PR trivially). The Lighthouse check needs a running server
and a real (simulated) browser session, which is slower and noisier
(timing-based metrics have natural run-to-run variance, hence
`numberOfRuns: 3` taking the median) — appropriate to run less often (e.g.
on `main`/nightly, or gated to PRs that touch `app/`, `components/`, or
`next.config.ts`) rather than on every commit.
