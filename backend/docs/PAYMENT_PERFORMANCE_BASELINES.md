# Payment Performance Baselines

Baselines for payment processing load tests (issue #1392).

Source of truth: `src/modules/payments/payment.performance.spec.ts`
(`PAYMENT_BENCHMARK_BASELINES`).

## How to run

```bash
cd backend
pnpm test -- payment.performance.spec.ts
```

## Baselines

| Scenario | Metric | Baseline (soft ceiling) |
| --- | --- | --- |
| 100 sequential `recordPayment` | wall time | ≤ 5 000 ms |
| 1000 concurrent unique-key `recordPayment` | wall time | ≤ 15 000 ms |
| 1000 concurrent unique-key `recordPayment` | avg per call | ≤ 15 ms |
| 1000 concurrent shared-key `recordPayment` | persisted rows | 1 (idempotent) |
| `listPayments` query-builder path | wall time | ≤ 200 ms |

## Notes

- Benchmarks run against in-memory LockService / IdempotencyService with
  mocked repositories and gateway — they guard **service-layer** regressions,
  not full Postgres + Redis latency.
- Tighten ceilings only after measuring on CI hardware; loosen only with a
  documented infra reason.
- For HTTP-level load tests, use `pnpm run perf` / `pnpm run perf:load`
  (see `PERFORMANCE_TESTING.md`).
