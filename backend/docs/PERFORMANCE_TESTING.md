# Performance Testing and Benchmarking Guide

This document provides comprehensive guidance on performance testing and benchmarking for the Chioma platform.

## Overview

The Chioma platform includes a robust performance testing and monitoring infrastructure designed to ensure optimal performance under various load conditions. This includes:

- **Real-time Performance Monitoring**: Automatic collection of performance metrics
- **Load Testing**: Comprehensive load testing scenarios for critical endpoints
- **Benchmarking**: Performance benchmarking with detailed reporting
- **Performance Alerts**: Automated alerting for performance degradation
- **Performance Dashboard**: Real-time performance monitoring dashboard

## Quick Start

### Running Basic Performance Tests

```bash
# Run basic performance benchmark
pnpm run perf

# Run enhanced performance benchmark with detailed reporting
pnpm run perf:enhanced

# Run comprehensive E2E performance tests
pnpm run perf:comprehensive

# Run load tests against local environment
pnpm run perf:local

# Run load tests against staging environment
pnpm run perf:staging
```

### Generating Performance Reports

```bash
# Generate HTML performance report
BENCHMARK_REPORT_FORMAT=html pnpm run perf:enhanced

# Generate JSON report for CI/CD
pnpm run perf:ci

# Run load test with HTML report
node scripts/load-test.mjs local --report-format=html
```

## Performance Testing Tools

### 1. Basic Performance Benchmark (`performance-benchmark.mjs`)

Simple autocannon-based benchmark for critical endpoints.

**Usage:**
```bash
node scripts/performance-benchmark.mjs [BASE_URL]
```

**Features:**
- Tests health endpoints, API docs, security.txt
- Configurable thresholds
- Exit codes for CI/CD integration

### 2. Enhanced Performance Benchmark (`performance-benchmark-enhanced.mjs`)

Advanced benchmarking with detailed metrics and reporting.

**Usage:**
```bash
node scripts/performance-benchmark-enhanced.mjs [BASE_URL] [OPTIONS]
```

**Options:**
- `--report-format=FORMAT`: console, json, html, csv
- Environment variables for configuration

**Features:**
- Multiple test scenarios
- Detailed performance metrics (P50, P90, P95, P99)
- System information collection
- Performance assessment and scoring
- Multiple report formats
- Performance regression detection

### 3. Load Testing Suite (`load-test.mjs`)

Comprehensive load testing with configurable scenarios.

**Usage:**
```bash
node scripts/load-test.mjs [environment] [options]
```

**Environments:**
- `local`: http://localhost:5000
- `staging`: https://staging-api.chioma.com
- `production`: https://api.chioma.com

**Options:**
- `--scenario=NAME`: Run specific scenario
- `--report-format=FORMAT`: Output format
- `--duration=SECONDS`: Override test duration
- `--connections=NUMBER`: Override connection count

### 4. Comprehensive E2E Performance Tests

Jest-based E2E performance tests with detailed assertions.

**Usage:**
```bash
pnpm run test:e2e -- --testPathPattern=performance-comprehensive
```

**Features:**
- Memory usage monitoring
- Database performance testing
- Rate limiting performance
- Stress testing
- Concurrent operation testing

## Performance Monitoring

### Real-time Monitoring

The platform includes automatic performance monitoring that:

- Collects metrics for all HTTP requests
- Monitors response times, error rates, and throughput
- Tracks memory usage and system resources
- Provides performance alerts and notifications

### Performance Dashboard

Access the performance dashboard at `/api/performance/dashboard` (admin only):

```bash
curl -H "Authorization: Bearer $TOKEN" \
     http://localhost:5000/api/performance/dashboard
```

### Performance Metrics API

Available endpoints:

- `GET /api/performance/dashboard` - Complete performance dashboard
- `GET /api/performance/endpoints` - All endpoint statistics
- `GET /api/performance/endpoint?method=GET&path=/api/properties` - Specific endpoint stats
- `GET /api/performance/system` - System performance metrics
- `GET /api/performance/report` - Comprehensive performance report
- `GET /api/performance/health-check` - Performance monitoring health
- `GET /api/performance/trends?period=24h` - Performance trends

## Performance Thresholds

### Critical Endpoints
- `/health`: P99 ≤ 100ms, RPS ≥ 500
- `/health/detailed`: P99 ≤ 200ms, RPS ≥ 200
- `/security.txt`: P99 ≤ 50ms, RPS ≥ 1000

### Important Endpoints
- `/api/docs-json`: P99 ≤ 500ms, RPS ≥ 100
- `/api/auth/login`: P99 ≤ 1000ms, RPS ≥ 50
- `/api/properties`: P99 ≤ 1500ms, RPS ≥ 30

### Standard Endpoints
- `/api/users/profile`: P99 ≤ 2000ms, RPS ≥ 20
- `/api/payments`: P99 ≤ 3000ms, RPS ≥ 10

## Load Testing Scenarios

### 1. Health Check Burst
- **Purpose**: Test system resilience under high-frequency health checks
- **Configuration**: 50 connections, 5 seconds
- **Expected**: P99 ≤ 100ms, RPS ≥ 500

### 2. Authentication Load
- **Purpose**: Test authentication system under load
- **Configuration**: 10 connections, 8 seconds
- **Expected**: P99 ≤ 1000ms, RPS ≥ 20

### 3. Property Listing Performance
- **Purpose**: Test property listing retrieval performance
- **Configuration**: 15 connections, 10 seconds
- **Expected**: P99 ≤ 1500ms, RPS ≥ 30

### 4. Property Search Performance
- **Purpose**: Test search functionality with filters
- **Configuration**: 12 connections, 8 seconds
- **Expected**: P99 ≤ 2000ms, RPS ≥ 25

### 5. Payment Processing Simulation
- **Purpose**: Test payment-related endpoints
- **Configuration**: 8 connections, 10 seconds
- **Expected**: P99 ≤ 3000ms, RPS ≥ 15

## Performance Decorators

Use performance tracking decorators in your code:

### @PerformanceTrack
```typescript
import { PerformanceTrack } from '../monitoring/performance.middleware';

@Injectable()
export class PropertyService {
  @PerformanceTrack('property-search')
  async searchProperties(criteria: SearchCriteria) {
    // Method implementation
  }
}
```

### @DatabasePerformanceTrack
```typescript
import { DatabasePerformanceTrack } from '../monitoring/performance.middleware';

@Injectable()
export class PropertyRepository {
  @DatabasePerformanceTrack('find-properties')
  async findProperties(filters: PropertyFilters) {
    // Database query implementation
  }
}
```

### @BlockchainPerformanceTrack
```typescript
import { BlockchainPerformanceTrack } from '../monitoring/performance.middleware';

@Injectable()
export class StellarService {
  @BlockchainPerformanceTrack('payment-processing')
  async processPayment(paymentData: PaymentData) {
    // Blockchain operation implementation
  }
}
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Performance Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  performance:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'pnpm'
    
    - name: Install dependencies
      run: pnpm install
    
    - name: Start application
      run: |
        pnpm run build
        pnpm run start:prod &
        sleep 30
    
    - name: Run performance tests
      run: pnpm run perf:ci
    
    - name: Upload performance report
      uses: actions/upload-artifact@v3
      with:
        name: performance-report
        path: performance-report-*.json
```

### Performance Gates

Set up performance gates in your CI/CD pipeline:

```bash
# Run performance tests and fail if thresholds are not met
pnpm run perf:enhanced
if [ $? -ne 0 ]; then
  echo "Performance tests failed - thresholds not met"
  exit 1
fi
```

## Monitoring and Alerting

### Performance Alerts

The system automatically triggers alerts for:

- **Response Time**: When P99 exceeds threshold
- **Error Rate**: When error rate exceeds 5%
- **Throughput**: When RPS falls below minimum
- **Memory Usage**: When memory usage exceeds 512MB
- **System Health**: When system becomes unhealthy

### Alert Configuration

Configure alert thresholds in the performance monitor service:

```typescript
private readonly performanceThresholds: PerformanceThreshold[] = [
  { endpoint: '/health', maxResponseTime: 100, maxErrorRate: 1, minThroughput: 100 },
  { endpoint: '/api/auth/login', maxResponseTime: 1000, maxErrorRate: 5, minThroughput: 20 },
  // Add more thresholds as needed
];
```

## Best Practices

### 1. Regular Performance Testing
- Run performance tests on every deployment
- Include performance tests in your CI/CD pipeline
- Monitor performance trends over time

### 2. Performance Budgets
- Set and maintain performance budgets for critical endpoints
- Use performance gates to prevent regressions
- Review and update thresholds regularly

### 3. Load Testing Strategy
- Test with realistic load patterns
- Include burst, sustained, and ramp-up scenarios
- Test both happy path and error scenarios

### 4. Monitoring and Observability
- Monitor key performance metrics continuously
- Set up alerts for performance degradation
- Use distributed tracing for complex operations

### 5. Performance Optimization
- Profile slow endpoints regularly
- Optimize database queries
- Implement caching strategies
- Use performance decorators for tracking

## Troubleshooting

### Common Performance Issues

1. **High Response Times**
   - Check database query performance
   - Review caching strategies
   - Analyze slow endpoints in dashboard

2. **High Error Rates**
   - Check application logs
   - Review error patterns
   - Verify system resources

3. **Low Throughput**
   - Check system resource utilization
   - Review rate limiting configuration
   - Analyze bottlenecks

4. **Memory Issues**
   - Monitor memory usage trends
   - Check for memory leaks
   - Review garbage collection patterns

### Performance Debugging

1. **Enable Verbose Logging**
   ```bash
   node scripts/load-test.mjs local --verbose
   ```

2. **Check Performance Dashboard**
   ```bash
   curl -H "Authorization: Bearer $TOKEN" \
        http://localhost:5000/api/performance/dashboard
   ```

3. **Generate Detailed Report**
   ```bash
   BENCHMARK_REPORT_FORMAT=html pnpm run perf:enhanced
   ```

4. **Monitor System Resources**
   ```bash
   # Check memory usage
   curl http://localhost:5000/api/performance/system
   
   # Check endpoint statistics
   curl http://localhost:5000/api/performance/endpoints
   ```

## Configuration

### Environment Variables

```bash
# Performance testing
BASE_URL=http://localhost:5000
BENCHMARK_DURATION=10
BENCHMARK_CONNECTIONS=10
BENCHMARK_REPORT_FORMAT=console
BENCHMARK_OUTPUT_FILE=performance-report

# Performance monitoring
PERFORMANCE_MONITORING_ENABLED=true
PERFORMANCE_ALERT_THRESHOLD_MS=2000
PERFORMANCE_MEMORY_THRESHOLD_MB=512
```

### Configuration Files

- `test/performance-config.json`: Load testing scenarios and thresholds
- `scripts/performance-benchmark-enhanced.mjs`: Benchmark configuration
- `src/modules/monitoring/performance-monitor.service.ts`: Monitoring thresholds

## Reporting

### Report Formats

1. **Console**: Real-time output during testing
2. **JSON**: Machine-readable format for CI/CD
3. **HTML**: Rich visual reports with charts
4. **CSV**: Data export for analysis

### Report Contents

- **Summary Statistics**: Total requests, average response time, success rate
- **Latency Distribution**: P50, P90, P95, P99 percentiles
- **Throughput Metrics**: Requests per second, bytes per second
- **Error Analysis**: Error rates, timeout counts
- **Performance Scoring**: Automated performance assessment
- **System Information**: Platform, memory, CPU details
- **Trend Analysis**: Performance over time
- **Recommendations**: Automated optimization suggestions

## Advanced Topics

### Custom Performance Metrics

Implement custom performance tracking:

```typescript
// Record custom business metrics
this.performanceMonitor.recordRentPayment('success');
this.performanceMonitor.recordNftMint('rent-obligation');
this.performanceMonitor.recordDispute('security-deposit', 'resolved');
```

### Performance Testing in Different Environments

```bash
# Local development
node scripts/load-test.mjs local --duration=5 --connections=5

# Staging environment
node scripts/load-test.mjs staging --duration=10 --connections=20

# Production monitoring (read-only tests)
node scripts/load-test.mjs production --scenario="Health Check Load Test"
```

### Integration with External Monitoring

The performance monitoring system can be integrated with:

- **Prometheus**: Export metrics for Prometheus scraping
- **Grafana**: Create dashboards for visualization
- **DataDog**: Send metrics to DataDog for monitoring
- **New Relic**: Application performance monitoring
- **Sentry**: Error tracking and performance monitoring

## Support

For questions or issues with performance testing:

1. Check the troubleshooting section above
2. Review the performance dashboard for insights
3. Examine application logs for errors
4. Create an issue in the project repository

## Contributing

When contributing performance improvements:

1. Run performance tests before and after changes
2. Document performance impact in pull requests
3. Update performance thresholds if needed
4. Add new test scenarios for new features
5. Follow performance best practices