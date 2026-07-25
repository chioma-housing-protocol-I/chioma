# Testing Standards

This document defines baseline testing standards for backend contributions, including unit, integration, and end-to-end testing expectations.

---

## Unit Testing

Unit tests validate isolated business logic with controlled dependencies.

Standards:

- Test one unit (service/function/class) at a time.
- Mock external dependencies (database, network, queue, cache).
- Cover success paths, validation failures, and edge conditions.
- Keep tests deterministic and fast.
- Avoid implementation-detail assertions when behavior assertions are possible.

Recommended tools:

- Jest for runner and assertions
- Nest testing utilities for module setup

---

## Integration Testing

Integration tests validate collaboration between components (controller-service-repository, module-level flows).

Standards:

- Use realistic module wiring where possible.
- Validate request/response contracts and persistence behavior.
- Prefer test databases or isolated schemas over broad stubs.
- Assert side effects (writes, events, cache invalidation) explicitly.

---

## E2E Testing

E2E tests validate user-visible behavior through real HTTP requests against the application boundary.

Standards:

- Cover critical flows: auth, payments, agreements, and permissions.
- Include unhappy paths (401/403/404/422 and rate-limit handling where applicable).
- Keep E2E scenarios focused and independent.
- Reset state between tests to prevent cross-test coupling.

---

## Contract Testing

Contract testing validates the agreement between our backend and external API providers.

Standards:

- Use `nock` to intercept outgoing requests.
- Use `jest-json-schema` to validate provider response shapes.
- Focus on request/response compatibility.
- Cover both success and error contracts.

Recommended tools:

- Nock
- Jest-json-schema

Commands:

- `make test-contract`: Run all contract tests.
- `pnpm run test:contract`: Run contract tests via Jest.

For more details, see [CONTRACT_TESTING.md](../api/CONTRACT_TESTING.md).

---

## Coverage Requirements

Minimum expectations for backend pull requests:

- Global line coverage: 80 percent minimum.
- Global branch coverage: 75 percent minimum.
- New or modified critical modules (auth, payments, agreements): 90 percent line coverage target.
- No reduction in overall coverage without a documented rationale in the PR.

Coverage should be validated in CI using `pnpm test:cov`.

---

## Mutation Testing

Mutation testing validates the effectiveness of your tests by introducing small changes (mutants) to your code and checking if your tests catch them.

Standards:

- Aim for a high mutation score in critical business logic.
- Use mutation testing to identify "weak" tests that pass but don't actually validate behavior.
- Run mutation tests locally before submitting major changes to core modules.

Commands:

- `make test-mutation`: Run full mutation test suite (slow).
- `make test-mutation-fast`: Run mutation tests on common utilities (faster).
- `pnpm run test:mutation -- --mutate src/path/to/file.ts`: Run on a specific file.

Recommended tools:

- Stryker Mutator

---

## Test Organization

Organize tests close to intent and scope:

- Unit tests: colocated near source files (`*.spec.ts`) or under module `__tests__`.
- Integration tests: grouped by module and feature behavior.
- E2E tests: under `backend/test` with `*.e2e-spec.ts`.

Keep test suites small and focused by feature area.

---

## Test Naming Conventions

Use behavior-first naming:

- `describe`: unit or feature scope
- `it/should`: expected behavior and condition

Examples:

- `describe('PaymentsService.createPayment')`
- `it('returns 422 when amount is below minimum')`
- `it('persists payment and emits payment.created event')`

Avoid vague names such as `it('works')` or `it('test payment')`.

---

## Database Seeding for Tests

Integration and E2E tests often require pre-populated data (users, properties, etc.).

### Using Test Helpers

Use `seedDatabase(dataSource)` from `test-helpers.ts` to populate the database with standard test data. This is typically done in `beforeAll` or `beforeEach` hooks.

```typescript
import { seedDatabase, clearDatabase } from './test-helpers';

beforeAll(async () => {
  await clearDatabase(dataSource);
  await seedDatabase(dataSource);
});
```

### Manual Seeding

You can manually seed the test database using the following command:

```bash
pnpm run seed:test
```

This runs `src/database/seeds/seed-test-db.ts` in the `test` environment.

---

## Mocking and Stubbing

Use mocks to isolate external systems while preserving meaningful behavior.

Guidelines:

- Mock only external boundaries, not internal logic under test.
- Prefer typed mocks over untyped `any` mocks.
- Keep stubs minimal and scenario-specific.
- Reset mocks between tests to avoid leakage.

---

## Fixtures and Test Data

Fixtures should be explicit and reusable.

Guidelines:

- Use factory helpers for entities and DTOs.
- Keep fixtures small and intentional.
- Use stable defaults and override only fields needed for a scenario.
- Separate valid and invalid fixture builders for clarity.

---

## Performance Testing

Performance validation is required for high-risk changes (query-heavy endpoints, batch jobs, hot paths).

Standards:

- Define baseline latency and throughput before changes.
- Compare before/after metrics for affected endpoints.
- Include simple load scripts or profiling notes in the PR when performance-sensitive.

---

## Best Practices

- Write tests as part of implementation, not as a final cleanup step.
- Test behavior, contracts, and side effects.
- Keep assertions focused; one test should validate one behavior.
- Prefer explicit setup over hidden global state.
- Prevent flaky tests by avoiding race conditions and time-dependent assumptions.

Good test pattern:

- Arrange clear data
- Act once
- Assert observable outcome

Common anti-patterns:

- Over-mocking internal logic
- Assertions on private implementation details
- Shared mutable fixtures across suites

---

## Testing Checklist

- [ ] Unit tests cover core logic and edge cases for changed code.
- [ ] Integration tests validate module interactions where behavior changed.
- [ ] E2E tests cover critical path changes and failure modes.
- [ ] Coverage thresholds are met and not regressed.
- [ ] Test names clearly describe behavior and condition.
- [ ] Mocks and fixtures are deterministic and scoped.
- [ ] Performance impact is assessed for high-risk paths.
