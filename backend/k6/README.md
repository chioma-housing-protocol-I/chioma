# k6 Performance Tests

This directory contains k6 performance tests for the Chioma backend API.

## Test Types

### Smoke Tests (`smoke-test.js`)

Lightweight performance checks that verify critical endpoints respond within acceptable thresholds under minimal load. These are designed to run quickly (≈2-3 minutes) and should be executed before full load tests.

**The 5 performance smoke tests cover:**

1. **Health Check Endpoint** - Verifies service availability and response time
   - 1 VU for 30 seconds
   - P95 < 200ms, P99 < 500ms
   - Error rate < 1%

2. **Authentication Flow** - Tests user registration and login
   - 2 VUs for 30 seconds
   - P95 < 1000ms, P99 < 2000ms
   - Error rate < 5%

3. **Property Listing** - Tests property listing with pagination
   - 2 VUs for 30 seconds
   - P95 < 800ms, P99 < 1500ms
   - Error rate < 5%

4. **Search Functionality** - Tests property search with various parameters
   - 3 VUs for 30 seconds
   - P95 < 1000ms, P99 < 2000ms
   - Error rate < 5%

5. **API Documentation Access** - Verifies API docs endpoint accessibility
   - 1 VU for 30 seconds
   - P95 < 500ms, P99 < 1000ms
   - Error rate < 1%

### Load Tests (`load-test.js`)

Comprehensive load/stress testing suite that simulates realistic user behavior patterns with ramping virtual users. These tests run longer and generate more detailed performance metrics.

## Running Tests

### Prerequisites

Install k6:
```bash
# macOS
brew install k6

# Linux
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6

# Windows
choco install k6
```

### Running Smoke Tests

**Local development:**
```bash
# Using npm script (recommended)
pnpm run perf:smoke

# Direct k6 command
k6 run backend/k6/smoke-test.js
```

**Against specific environment:**
```bash
# Staging
k6 run backend/k6/smoke-test.js -e BASE_URL=https://staging-api.chioma.com

# Production (use with caution)
k6 run backend/k6/smoke-test.js -e BASE_URL=https://api.chioma.com
```

**Output:**
- Console: Real-time test results with color-coded pass/fail
- File: `smoke-test-summary.json` - JSON summary of all test results

### Running Load Tests

**Local development:**
```bash
pnpm run perf:k6
```

**With custom parameters:**
```bash
k6 run backend/k6/load-test.js \
  -e BASE_URL=https://staging-api.chioma.com \
  -e K6_VUS_PEAK=50 \
  -e K6_RAMP_DURATION=1m \
  -e K6_HOLD_DURATION=5m
```

## Environment Variables

Both test suites support the following environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `BASE_URL` | Target API origin | `http://localhost:5000` |
| `K6_VUS_PEAK` | Peak virtual users (load test only) | `20` |
| `K6_RAMP_DURATION` | Ramp up/down duration (load test only) | `30s` |
| `K6_HOLD_DURATION` | Steady state duration (load test only) | `1m` |

## CI/CD Integration

The smoke tests are ideal for CI/CD pipelines as they run quickly and provide fast feedback:

```yaml
# Example GitHub Actions step
- name: Run performance smoke tests
  run: |
    k6 run backend/k6/smoke-test.js \
      -e BASE_URL=${{ secrets.STAGING_API_URL }}
```

For comprehensive load testing, use the GitHub workflow:
```bash
gh workflow run load-test.yml \
  -f target=staging \
  -f vus_peak=50 \
  -f hold_duration=5m
```

## Interpreting Results

### Success Criteria

**Smoke Tests:**
- All health checks pass with < 1% error rate
- Authentication completes within 2 seconds (P99)
- Property listing and search respond within 2 seconds (P95)
- API docs load within 1 second (P99)

**Load Tests:**
- Property search: P95 < 1.5s, P99 < 3s
- Booking creation: P95 < 2s, P99 < 4s
- Payment submission: P95 < 2.5s, P99 < 5s
- Error rate < 5% for all scenarios

### Common Issues

1. **High error rates in auth tests** - Check database connections and auth service
2. **Slow health check response** - Investigate infrastructure/network issues
3. **Search timeouts** - Review database indexes and query optimization
4. **Booking conflicts in load tests** - Expected under concurrent load; check conflict rate

## Best Practices

1. **Run smoke tests first** - Quick validation before expensive load tests
2. **Baseline metrics** - Run tests regularly to establish performance baselines
3. **Environment consistency** - Always test against the same environment configuration
4. **Data seeding** - Ensure test environment has representative data
5. **Monitor resources** - Watch CPU, memory, and database metrics during tests

## Troubleshooting

**Tests fail immediately:**
- Verify BASE_URL is accessible
- Check network connectivity
- Ensure backend service is running

**Authentication fails:**
- Verify auth endpoints are enabled
- Check that test users can register
- Review rate limiting configuration

**Inconsistent results:**
- Ensure stable network connection
- Run tests during off-peak hours
- Increase test duration for more accurate metrics

## Further Reading

- [k6 Documentation](https://k6.io/docs/)
- [Performance Testing Best Practices](https://k6.io/docs/testing-guides/test-types/)
- [Chioma Backend Performance Guide](../QUICK_REFERENCE.md#performance-testing)
