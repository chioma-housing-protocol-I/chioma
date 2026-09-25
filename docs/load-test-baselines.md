# Load & Stress Test Suite

## What it covers

A [k6](https://k6.io) suite at [`backend/k6/load-test.js`](../backend/k6/load-test.js)
exercises the three core user flows under concurrent load:

| Scenario            | Endpoint                          | What it simulates                        |
| -------------------- | ---------------------------------- | ----------------------------------------- |
| `search`             | `GET /api/v1/properties`           | Browsing/searching listings (read-heavy)  |
| `booking_creation`   | `POST /api/v1/bookings`            | A guest creating a booking request        |
| `payment_submission` | `POST /api/v1/payments`            | A tenant recording a rent/booking payment |

Each scenario ramps virtual users up, holds a steady peak, then ramps back
down (a stress-test shape, not a fixed-rate smoke test), and reports p95/p99
latency and error rate independently per scenario.

`setup()` registers a throwaway test user, fetches a real property ID for the
booking scenario, and creates a payment method for the payment scenario. If
the target environment has no published properties, the booking scenario
logs a warning and no-ops rather than failing the whole run — seed at least
one published property before running against a fresh environment.

## Running it

Locally (requires the [k6 binary](https://grafana.com/docs/k6/latest/set-up/install-k6/)
installed separately — it is not an npm dependency):

```bash
cd backend
k6 run k6/load-test.js -e BASE_URL=http://localhost:5000
# or: pnpm run perf:k6
```

Tunables via `-e`/env vars: `BASE_URL`, `K6_VUS_PEAK` (default 20),
`K6_RAMP_DURATION` (default `30s`), `K6_HOLD_DURATION` (default `1m`).

## Running in CI

[`load-test.yml`](../.github/workflows/load-test.yml) runs the suite
on demand via `workflow_dispatch` — it is **not** wired into the push/PR
pipeline, since a stress test against staging shouldn't gate every merge.
Trigger it from the Actions tab, choosing the target environment (`staging`
or `production`) and optionally overriding VU count / durations. The base
URL comes from the `LOAD_TEST_BASE_URL` repository/environment variable
(or the `base_url` input override), and the k6 summary JSON is uploaded as
a build artifact.

This is a separate concern from [response-time-tracking.md](./response-time-tracking.md)'s
CI-enforced per-request p95/p99 budgets, which run on every push against a
handful of public, no-auth endpoints — this suite instead stress-tests
authenticated, state-changing flows on demand against a real environment.

## Baselines

No run has been recorded against a live staging environment yet. Populate
this table after the first `workflow_dispatch` run (values from the
`k6-summary.json` artifact) and update it whenever infrastructure changes
significantly:

| Scenario              | VUs (peak) | p95 (ms) | p99 (ms) | Error rate | Recorded |
| ---------------------- | ---------- | -------- | -------- | ---------- | -------- |
| `search`               | TBD        | TBD      | TBD      | TBD        | TBD      |
| `booking_creation`     | TBD        | TBD      | TBD      | TBD        | TBD      |
| `payment_submission`   | TBD        | TBD      | TBD      | TBD        | TBD      |

The in-script thresholds (`p95 < 1.5–2.5s`, `p99 < 3–5s`, error rate `< 5%`
per scenario, depending on endpoint) are starting points based on the
existing CI response-time budgets in
[response-time-tracking.md](./response-time-tracking.md); tighten them once
real baselines are recorded.
