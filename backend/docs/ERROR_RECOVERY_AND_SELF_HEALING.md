# Error Recovery and Self-Healing Guide

## Overview

This guide documents the error recovery and self-healing infrastructure implemented to ensure production readiness. The system provides automated recovery, cascading failure detection, and proactive health management.

## Architecture

### Core Components

#### 1. **Circuit Breaker Service** (`circuit-breaker.service.ts`)

Implements the Circuit Breaker pattern to prevent cascading failures.

**States:**

- **CLOSED**: Normal operation, all requests pass through
- **OPEN**: Service failing, requests rejected immediately (fail fast)
- **HALF_OPEN**: Testing recovery, limited requests allowed

**Usage:**

```typescript
import { CircuitBreakerService } from '@/common/resilience/circuit-breaker.service';

constructor(private circuitBreaker: CircuitBreakerService) {}

async callExternalService() {
  try {
    return await this.circuitBreaker.execute(
      'stellar-api',
      () => this.stellarClient.call(),
      {
        failureThreshold: 0.5,      // Open after 50% failures
        timeout: 60_000,             // Wait 60s before testing recovery
        windowSize: 100,             // Track last 100 requests
      }
    );
  } catch (error) {
    if (error instanceof CircuitBreakerOpenError) {
      // Service is down, use fallback
      return this.fallback.execute(/* ... */);
    }
    throw error;
  }
}
```

**Metrics Exposed:**

- `circuit_breaker_state` - Current state per breaker
- `circuit_breaker_requests_total` - Total requests
- `circuit_breaker_failures_total` - Total failures
- `circuit_breaker_state_changes` - State transitions

#### 2. **Retry Service** (`retry.service.ts`)

Centralized retry logic with exponential backoff and jitter.

**Features:**

- Exponential backoff with configurable multiplier
- Jitter to prevent thundering herd
- Retryable error detection (network errors only, not client errors)
- Comprehensive retry metrics

**Usage:**

```typescript
import { RetryService } from '@/common/resilience/retry.service';

constructor(private retry: RetryService) {}

async fetchUserData(userId: string) {
  return await this.retry.execute(
    `fetch-user-${userId}`,
    () => this.api.getUser(userId),
    {
      maxAttempts: 3,
      initialDelayMs: 100,
      maxDelayMs: 10_000,
      multiplier: 2,
      jitterFactor: 0.1,
    }
  );
}
```

**Default Retry Predicate:**

- Retries: `TimeoutError`, `ECONNREFUSED`, `ECONNRESET`, socket errors
- Skips: validation errors, 404, 401, 403 (client errors)

#### 3. **Request Timeout Interceptor** (`timeout.interceptor.ts`)

Global timeout enforcement to prevent hung requests.

**Timeout Values:**

- General requests: 30s
- File uploads: 60s
- Webhooks: 60s
- Blockchain: 45s
- Health checks: 10s

**Integration:**

```typescript
import { TimeoutInterceptor } from '@/common/interceptors/timeout.interceptor';

@Module({
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: TimeoutInterceptor,
    },
  ],
})
export class AppModule {}
```

#### 4. **Cascade Detector Service** (`cascade-detector.service.ts`)

Detects cascading failures across interconnected services.

**Features:**

- Service dependency mapping
- Cascade detection within configurable threshold (5s)
- Severity calculation based on cascade depth
- Cascade history tracking

**Usage:**

```typescript
import { CascadeDetectorService } from '@/common/resilience/cascade-detector.service';

constructor(private cascade: CascadeDetectorService) {}

onModuleInit() {
  this.cascade.registerDependencies([
    { name: 'api', dependsOn: ['database', 'cache'] },
    { name: 'payment', dependsOn: ['database', 'payment-gateway'] },
  ]);
}

recordFailure(service: string) {
  this.cascade.recordFailure(service);
  const status = this.cascade.getCascadeStatus();
  if (status.isInCascade) {
    // Alert on cascading failure
  }
}
```

#### 5. **Auto-Recovery Service** (`auto-recovery.service.ts`)

Automated self-healing workflows that execute recovery actions without human intervention.

**Default Recovery Actions:**

1. **reset-stale-circuit-breakers** - Reset circuit breakers open >5 minutes
2. **resolve-cascades** - Handle cascading failure incidents
3. **escalate-degradation** - Escalate to SEVERE mode if >3 services fail
4. **deescalate-degradation** - Return to NORMAL when services recover
5. **detect-repetitive-failures** - Alert on services with >80% failure rate

**Usage:**

```typescript
import { AutoRecoveryService } from '@/modules/maintenance/auto-recovery.service';

constructor(private recovery: AutoRecoveryService) {}

// Trigger recovery manually
async manualRecovery() {
  await this.recovery.recover('reset-stale-circuit-breakers');
}

// Register custom action
registerCustomAction() {
  this.recovery.registerAction({
    name: 'clear-redis-if-full',
    description: 'Clear Redis if memory usage exceeds 90%',
    severity: 'high',
    execute: async () => {
      const info = await this.redis.info('memory');
      if (parseFloat(info.used_memory_percent) > 90) {
        await this.redis.flushdb();
      }
    },
  });
}
```

**Execution:** Runs automatically every 30 seconds when enabled

#### 6. **Health Recovery Service** (`health-recovery.service.ts`)

Proactive health management for preventive maintenance.

**Default Healing Strategies:**

1. **force-gc-if-high-memory** - Garbage collection if >85% heap used
2. **reconnect-if-db-stale** - Reconnect to database if stale
3. **clear-stale-cache** - Clear expired cache entries
4. **drain-queue-backlog** - Process queue backlog
5. **rebalance-pools** - Rebalance connection pools

**Execution:** Runs every 60 seconds when enabled

#### 7. **Dead Letter Queue Processor** (`dlq.processor.ts`)

Handles jobs that fail permanently after exhausting retries.

**Features:**

- Job classification by severity (SEV1-SEV4)
- Recovery predicate for transient errors
- Job archiving for analysis
- Exponential backoff re-queuing

**DLQ Job Severity:**

- **SEV1** (Critical): Database/connection errors
- **SEV2** (High): Payment, blockchain, auth failures
- **SEV3** (Medium): >10 failures
- **SEV4** (Low): Other transient failures

## Integration Guide

### 1. Enable in App Module

```typescript
import { CircuitBreakerService } from '@/common/resilience/circuit-breaker.service';
import { RetryService } from '@/common/resilience/retry.service';
import { TimeoutInterceptor } from '@/common/interceptors/timeout.interceptor';
import { CascadeDetectorService } from '@/common/resilience/cascade-detector.service';
import { AutoRecoveryService } from '@/modules/maintenance/auto-recovery.service';
import { HealthRecoveryService } from '@/modules/maintenance/health-recovery.service';
import { DLQProcessor } from '@/modules/queues/dlq.processor';

@Module({
  imports: [
    // ... other imports
    BullModule.registerQueue({ name: DLQ_QUEUE_NAME }),
  ],
  providers: [
    CircuitBreakerService,
    RetryService,
    CascadeDetectorService,
    AutoRecoveryService,
    HealthRecoveryService,
    DLQProcessor,
    {
      provide: APP_INTERCEPTOR,
      useClass: TimeoutInterceptor,
    },
  ],
})
export class AppModule {}
```

### 2. Integrate with External API Calls

```typescript
import { CircuitBreakerService } from '@/common/resilience/circuit-breaker.service';
import { RetryService } from '@/common/resilience/retry.service';

export class StellarClient {
  constructor(
    private circuit: CircuitBreakerService,
    private retry: RetryService,
  ) {}

  async callApi(path: string): Promise<any> {
    // Use circuit breaker + retry for resilience
    return this.circuit.execute('stellar-api', () =>
      this.retry.execute('stellar-api-call', () => this.makeRequest(path)),
    );
  }
}
```

### 3. Register Service Dependencies

```typescript
import { CascadeDetectorService } from '@/common/resilience/cascade-detector.service';

@Injectable()
export class AppInitService {
  constructor(private cascade: CascadeDetectorService) {}

  onModuleInit() {
    this.cascade.registerDependencies([
      { name: 'http-server', dependsOn: ['database', 'redis'] },
      { name: 'webhook-processor', dependsOn: ['queue', 'database'] },
      { name: 'payment-service', dependsOn: ['payment-gateway', 'database'] },
      { name: 'blockchain-service', dependsOn: ['stellar-rpc', 'database'] },
      { name: 'cache-service', dependsOn: ['redis'] },
    ]);
  }
}
```

### 4. Configure DLQ Handling

```typescript
import { BullModule } from '@nestjs/bull';
import { DLQ_QUEUE_NAME, DLQProcessor } from '@/modules/queues/dlq.processor';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'jobs' }, { name: DLQ_QUEUE_NAME }),
  ],
  providers: [DLQProcessor],
})
export class QueuesModule {}
```

## Monitoring & Observability

### Prometheus Metrics

The system exposes comprehensive metrics:

```
# Circuit Breaker
circuit_breaker_state{breaker_name="stellar-api", state="CLOSED"} 1
circuit_breaker_requests_total{breaker_name="stellar-api"} 1000
circuit_breaker_failures_total{breaker_name="stellar-api"} 45

# Retry
retry_attempts_total{operation="user-fetch"} 1500
retry_exhausted_total{operation="user-fetch"} 3
retry_successful_retries_total{operation="user-fetch"} 100

# Auto-Recovery
auto_recovery_actions_executed_total 250
auto_recovery_failures_total 2

# Health Recovery
health_recovery_strategies_executed_total 300
health_recovery_gc_collections_total 15

# Dead Letter Queue
dlq_size 42
dlq_processed_total 500
dlq_failed_recoveries_total 10
```

### Alert Rules

See `backend/monitoring/prometheus/alerts-resilience.yml` for comprehensive alert rules.

**Critical Alerts:**

- Circuit breaker open >50% failure rate
- Cascading failure detected
- System severely degraded
- DLQ backlog >100 jobs
- High timeout rate

## Best Practices

### 1. **Always Use Circuit Breaker for External Services**

```typescript
// ❌ Bad: No circuit breaker
const response = await http.get(externalApi);

// ✅ Good: Circuit breaker + retry
const response = await this.circuit.execute('external-api', () =>
  this.retry.execute('external-api', () => http.get(externalApi)),
);
```

### 2. **Configure Appropriate Timeouts**

```typescript
// ❌ Bad: No timeout
const response = await fetch(url);

// ✅ Good: Timeout configured (handled by interceptor)
// All requests automatically have appropriate timeouts
```

### 3. **Mark Services as Failed When Appropriate**

```typescript
import { CascadeDetectorService } from '@/common/resilience/cascade-detector.service';

export class DatabaseService {
  constructor(private cascade: CascadeDetectorService) {}

  onConnectionLost() {
    this.cascade.recordFailure('database');
    // ... other handling
  }

  onConnectionRestored() {
    this.cascade.recordRecovery('database');
  }
}
```

### 4. **Enable Auto-Recovery When Running in Production**

```typescript
import { AutoRecoveryService } from '@/modules/maintenance/auto-recovery.service';

export class ConfigService {
  constructor(private recovery: AutoRecoveryService) {}

  onModuleInit() {
    const isProduction = process.env.NODE_ENV === 'production';
    this.recovery.setEnabled(isProduction);
  }
}
```

### 5. **Configure DLQ for Critical Job Queues**

```typescript
// Configure queue with DLQ handling
const queueConfig = {
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },
};
```

## Troubleshooting

### Circuit Breaker Frequently Opening

**Symptoms:** Errors like "Circuit breaker is OPEN"

**Diagnosis:**

```typescript
const metrics = this.circuitBreaker.getMetrics();
console.log(metrics); // Check failure rate
```

**Solutions:**

1. Increase `failureThreshold` if service has occasional failures
2. Increase `timeout` for longer recovery windows
3. Check underlying service health
4. Consider using fallback service

### High Retry Rate

**Symptoms:** Many "RetryExhaustedError" exceptions

**Diagnosis:**

```typescript
const metrics = this.retry.getAllMetrics();
console.log(metrics); // Check which operations are failing
```

**Solutions:**

1. Check if underlying service is stable
2. Increase `maxAttempts` for transient errors
3. Adjust `initialDelayMs` if too aggressive
4. Verify network connectivity

### Memory Leaks Not Detected

**Symptoms:** Process memory continuously grows

**Solutions:**

1. Run with `--expose-gc` to enable garbage collection trigger
2. Check `health-recovery` service is enabled
3. Manually trigger GC: `global.gc()`
4. Use profiling tools to identify leaks

### Cascading Failures Not Detected

**Symptoms:** Multiple service failures not correlated

**Solutions:**

1. Verify dependencies registered correctly
2. Ensure `recordFailure()` called when services fail
3. Check cascade threshold (default: 5s)
4. Review logs for cascade events

## Performance Impact

The error recovery and self-healing systems have minimal performance overhead:

- **Circuit Breaker:** <1ms per request (state check)
- **Retry:** 100-200ms (depends on backoff strategy)
- **Timeout Interceptor:** <0.5ms per request
- **Cascade Detection:** <1ms per failure event
- **Auto-Recovery:** 30s interval scan (background)
- **Health Recovery:** 60s interval scan (background)

**Memory Usage:** ~5-10MB for services with 100+ endpoints

## Testing

### Unit Testing Circuit Breaker

```typescript
it('should open after failure threshold', async () => {
  const breaker = service.getBreaker('test', {
    failureThreshold: 0.3,
    windowSize: 10,
  });

  // Trigger failures
  for (let i = 0; i < 4; i++) {
    try {
      await breaker.execute(() => Promise.reject(new Error('fail')));
    } catch {}
  }

  // Next request should be rejected
  expect(() => breaker.execute(() => Promise.resolve())).toThrow(
    CircuitBreakerOpenError,
  );
});
```

### Integration Testing

See `backend/docs/community/TESTING_STANDARDS.md` for comprehensive testing guide.

## See Also

- `backend/docs/RESILIENCE.md` - Resilience patterns and testing
- `backend/docs/GRACEFUL_SHUTDOWN.md` - Graceful shutdown configuration
- `backend/docs/INCIDENT_RESPONSE.md` - Incident response procedures
- `backend/docs/MONITORING_SETUP.md` - Monitoring infrastructure setup
