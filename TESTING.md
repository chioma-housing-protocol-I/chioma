# Testing Strategy

This repository has three independently-tested parts: `backend/`,
`frontend/`, and `contract/`. Each has its own detailed testing guide; this
page is the entry point that ties them together (#2069). There was
previously no single page answering "what's the testing strategy for this
whole repo" — only the per-part docs below, each written for its own
contributors.

## Test pyramid, per part

| Part       | Unit                        | Integration                                   | End-to-end                                                     |
| ---------- | ---------------------------- | ---------------------------------------------- | ---------------------------------------------------------------- |
| `backend/`  | Service/controller specs (`*.spec.ts`, Jest) | In-process module tests against a real Postgres (`*.integration.spec.ts`) | Full HTTP request/response through the Nest app (`test/*.e2e-spec.ts`) |
| `frontend/` | Component tests (Vitest + Testing Library)   | N/A today                                       | Visual regression against a real `next dev` server (Playwright, screenshot diffing, not behavioral flows) |
| `contract/` | Per-contract unit tests (`contracts/<name>/src/tests.rs`, `cargo test`) | Cross-actor, multi-step flow tests in the same `cargo test` run | N/A (WASM build check stands in for a release-readiness gate) |

**Note on frontend E2E:** `frontend/playwright.config.ts` is scoped to
`__tests__/visual/**/*.visual.spec.ts` — it is a visual regression suite
(screenshot diffing), not a behavioral end-to-end suite (no login flow,
booking flow, etc. is exercised end-to-end today). If a real frontend E2E
flow suite is added later, give it its own `testDir`/`testMatch` rather
than mixing it into the visual config, since the two have different
failure semantics (a visual diff is not automatically a behavioral bug).

## Coverage targets

| Part       | Command                 | Current thresholds |
| ---------- | ------------------------ | -------------------- |
| `backend/`  | `pnpm test:cov`           | 80% lines / 75% branches globally; 90% lines on auth, payments, agreements (see [backend/docs/community/TESTING_STANDARDS.md](backend/docs/community/TESTING_STANDARDS.md#coverage-requirements)) |
| `frontend/` | `pnpm test:cov`           | 30% lines / 25% branches / 25% functions / 30% statements, scoped to `components/**` (`frontend/vitest.config.ts`) |
| `contract/` | `cargo tarpaulin` (if configured) or manual review | No enforced numeric threshold today; see [contract/docs/testing/TEST-COVERAGE.md](contract/docs/testing/TEST-COVERAGE.md) |

The frontend's thresholds are intentionally lower than the backend's right
now (documented here as-is, not aspirationally) — raise them incrementally
as component test coverage grows rather than lowering backend's to match.

## Test data

- **Backend:** seed scripts under `backend/src/database/seeds/` (e.g.
  `seed-comprehensive.ts`, `seed-currencies.ts`, `seed-scenarios.ts`) and
  test helpers described in
  [backend/docs/community/TESTING_STANDARDS.md](backend/docs/community/TESTING_STANDARDS.md#database-seeding-for-tests).
  Integration/E2E tests run against a real Postgres instance
  (`DB_TYPE=postgres`, see `backend/package.json`'s `test:e2e` script), not
  an in-memory substitute, so seeded fixtures must be idempotent (safe to
  run against a non-empty database).
- **Frontend:** component tests mock data inline per test file; there is no
  shared fixture library today.
- **Contract:** each contract's test module builds its own fixtures via
  helpers named for what they create (`create_initialized_env`,
  `create_funded_escrow`, etc.), kept local to that contract's test file
  rather than shared across contracts, per
  [contract/docs/testing/TESTING-STRATEGY.md](contract/docs/testing/TESTING-STRATEGY.md#test-organization).

## Running tests locally

```bash
# Backend: unit + integration (no external services required beyond what's mocked)
cd backend && pnpm test

# Backend: full e2e suite (requires a running Postgres; see test/jest-e2e.json)
cd backend && pnpm test:e2e

# Frontend: component tests
cd frontend && pnpm test

# Frontend: visual regression (spins up `next dev` on port 3100 automatically)
cd frontend && pnpm test:visual

# Contract: unit + integration tests, formatting, lint, and WASM build
cd contract && cargo fmt --all -- --check && cargo clippy --all-targets --all-features -- -D warnings && cargo test && cargo build --target wasm32-unknown-unknown --release
```

## Documentation map

- Backend: [backend/docs/community/TESTING_STANDARDS.md](backend/docs/community/TESTING_STANDARDS.md) — unit/integration/E2E conventions, coverage requirements, mutation testing, fixtures, mocking.
- Contract: [contract/docs/testing/TESTING-STRATEGY.md](contract/docs/testing/TESTING-STRATEGY.md), with [Unit Tests](contract/docs/testing/UNIT-TESTS.md), [Integration Tests](contract/docs/testing/INTEGRATION-TESTS.md), [Test Coverage](contract/docs/testing/TEST-COVERAGE.md), and [Debugging Tests](contract/docs/testing/DEBUGGING.md).
- Frontend: no dedicated testing guide exists yet beyond this page and the inline config in `frontend/vitest.config.ts` / `frontend/playwright.config.ts`. If frontend testing conventions grow enough to need their own page (test file naming, mocking patterns, when to add a component test vs. a visual regression test), add `frontend/docs/TESTING.md` and link it here, following the same structure as the backend's guide.
- Performance testing (load/stress, not covered above): [backend/docs/PERFORMANCE_TESTING.md](backend/docs/PERFORMANCE_TESTING.md).
- Frontend performance budget (JS bundle size, Core Web Vitals; #2079): [frontend/docs/PERFORMANCE_BUDGET.md](frontend/docs/PERFORMANCE_BUDGET.md).
