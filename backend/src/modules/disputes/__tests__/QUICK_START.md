# Dispute Integration Tests - Quick Start Guide

## Running the Tests

### Prerequisites

```bash
cd backend
pnpm install
```

### Run All Tests

```bash
# Run all dispute tests
pnpm test disputes

# Run only integration tests
pnpm test disputes.integration.spec.ts

# Run with coverage
pnpm test:cov disputes
```

### Using Makefile (Recommended)

```bash
# Run all tests
make test

# Run with coverage report
make test-cov

# Run full CI pipeline (includes all checks)
make ci
```

## Test Structure

### Integration Tests (`disputes.integration.spec.ts`)

- **9 test suites**
- **34 test cases**
- **855 lines of comprehensive testing**

#### Test Suites:

1. **Create Dispute** (6 tests)
   - Happy path creation
   - Metadata handling
   - Duplicate prevention
   - Authorization checks
   - Error handling

2. **Query Disputes** (5 tests)
   - Pagination
   - Filtering by status, type, agreement
   - Relation loading

3. **Add Evidence** (4 tests)
   - File upload validation
   - File type restrictions
   - Size limits
   - Multiple uploads

4. **Add Comments** (4 tests)
   - Comment creation
   - Internal comments (admin-only)
   - Permission checks
   - Ordering

5. **Resolve Dispute** (4 tests)
   - Resolution workflow
   - Agreement status updates
   - Admin-only operations
   - Status validation

6. **Update Dispute** (3 tests)
   - Status updates
   - Transition validation
   - State machine logic

7. **Get Agreement Disputes** (3 tests)
   - Agreement-based queries
   - Sorting
   - Access control

8. **Edge Cases** (5 tests)
   - Concurrency handling
   - Not found scenarios
   - Empty results
   - Data integrity

## Contract Tests

### Payment Gateway (`payment-gateway.contract.spec.ts`)

```bash
pnpm test payment-gateway.contract.spec.ts
```

### SMS Service (`sms-service.contract.spec.ts`)

```bash
pnpm test sms-service.contract.spec.ts
```

## Debugging Tests

### Run specific test

```bash
pnpm test -t "should successfully create a dispute"
```

### Run with verbose output

```bash
pnpm test disputes --verbose
```

### Run in watch mode (for development)

```bash
pnpm test:watch disputes
```

## Coverage Reports

### Generate coverage report

```bash
make test-cov
```

### View coverage report

```bash
# Open in browser
open coverage/lcov-report/index.html
```

## CI/CD Integration

### Local CI validation

```bash
# Run the same checks as CI
make ci
```

This runs:

1. ✅ Install dependencies
2. ✅ Format checking
3. ✅ Linting
4. ✅ Type checking
5. ✅ Tests with coverage
6. ✅ Build

### Pre-commit checks

```bash
make pre-commit
```

## Test Database

The integration tests use:

- **In-memory SQLite database**
- **Automatic setup and teardown**
- **Isolated test environment**
- **No external dependencies**

## Common Issues

### Issue: Tests fail with "Cannot find module"

**Solution:** Run `pnpm install` to ensure all dependencies are installed

### Issue: Database connection errors

**Solution:** Integration tests use in-memory database, no external DB needed

### Issue: Tests timeout

**Solution:** Increase Jest timeout in test file or use `--testTimeout` flag

### Issue: Coverage below threshold

**Solution:** Add more test cases or check for untested code paths

## Test Data

The tests automatically create:

- 3 test users (landlord, tenant, admin)
- 1 test rent agreement
- Multiple disputes for testing

All data is cleaned up after each test.

## Best Practices

1. **Run tests before committing**

   ```bash
   make pre-commit
   ```

2. **Check coverage regularly**

   ```bash
   make test-cov
   ```

3. **Run full CI locally**

   ```bash
   make ci
   ```

4. **Keep tests isolated**
   - Each test should be independent
   - Use beforeEach/afterEach for cleanup
   - Don't rely on test execution order

5. **Test edge cases**
   - Invalid inputs
   - Permission boundaries
   - Concurrent operations
   - Error scenarios

## Additional Resources

- [Test Coverage Summary](./TEST_COVERAGE_SUMMARY.md)
- [Dispute Module README](../README.md)
- [Backend Makefile](../../../Makefile)
- [Testing Standards](../../../docs/community/TESTING_STANDARDS.md)
