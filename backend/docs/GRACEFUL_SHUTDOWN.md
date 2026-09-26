# Graceful Shutdown and Connection Cleanup

This document describes the graceful shutdown mechanism implemented in the Chioma backend, ensuring clean termination of connections and in-flight requests.

## Overview

Graceful shutdown is critical for production systems to:

- **Prevent data loss**: Allow in-flight requests to complete
- **Maintain consistency**: Close database connections cleanly
- **Improve reliability**: Reduce errors during deployments
- **Enable zero-downtime deployments**: Coordinate with load balancers

## Implementation

### Signal Handlers

The application listens for termination signals:

```typescript
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('uncaughtException', (error) =>
  gracefulShutdown('uncaughtException'),
);
process.on('unhandledRejection', (reason, promise) =>
  gracefulShutdown('unhandledRejection'),
);
```

**Signal Types**:

- **SIGTERM**: Graceful termination (sent by Kubernetes, Docker, systemd)
- **SIGINT**: Interrupt signal (Ctrl+C in terminal)
- **uncaughtException**: Unhandled synchronous error
- **unhandledRejection**: Unhandled promise rejection

### Shutdown Sequence

The graceful shutdown follows this sequence:

```
1. Receive Signal
   ↓
2. Set isShuttingDown = true (prevent duplicate shutdowns)
   ↓
3. Close HTTP Server (stop accepting new connections)
   ↓
4. Wait for Active Connections (with timeout)
   ↓
5. Close Database Connections
   ↓
6. Close Redis Connections
   ↓
7. Close NestJS Application
   ↓
8. Exit Process (code 0)
```

### Connection Tracking

The application tracks active connections:

```typescript
let activeConnections = 0;

server.on('connection', (conn) => {
  activeConnections++;
  conn.on('close', () => {
    activeConnections--;
  });
});
```

This allows the shutdown handler to:

- Know how many requests are in-flight
- Wait for them to complete
- Force shutdown if timeout exceeded

### Timeout Configuration

The graceful shutdown timeout is configurable:

```typescript
const shutdownTimeout = parseInt(
  process.env.GRACEFUL_SHUTDOWN_TIMEOUT || '30000',
  10,
);
```

**Default**: 30 seconds (30000 ms)

**Environment Variable**: `GRACEFUL_SHUTDOWN_TIMEOUT`

### Shutdown Handler

The main shutdown handler:

```typescript
const gracefulShutdown = async (signal: string) => {
  if (isShuttingDown) {
    bootstrapLogger.warn(`Shutdown already in progress, ignoring ${signal}`);
    return;
  }

  isShuttingDown = true;
  bootstrapLogger.log(`Received ${signal}, starting graceful shutdown...`);

  // 1. Stop accepting new connections
  server.close(async () => {
    bootstrapLogger.log('HTTP server closed');
  });

  // 2. Wait for active connections to close
  const startTime = Date.now();
  while (activeConnections > 0) {
    const elapsed = Date.now() - startTime;
    if (elapsed > shutdownTimeout) {
      bootstrapLogger.warn(
        `Graceful shutdown timeout exceeded. Forcing exit with ${activeConnections} active connections.`,
      );
      break;
    }
    bootstrapLogger.log(
      `Waiting for ${activeConnections} active connections to close...`,
    );
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  // 3. Close database connections
  try {
    const dataSource = app.get('DataSource');
    if (dataSource?.isInitialized) {
      bootstrapLogger.log('Closing database connections...');
      await dataSource.destroy();
      bootstrapLogger.log('Database connections closed');
    }
  } catch (error) {
    bootstrapLogger.error('Error closing database connections:', error);
  }

  // 4. Close Redis connections
  try {
    const redisService = app.get('RedisService');
    if (redisService?.disconnect) {
      bootstrapLogger.log('Closing Redis connections...');
      await redisService.disconnect();
      bootstrapLogger.log('Redis connections closed');
    }
  } catch (error) {
    bootstrapLogger.error('Error closing Redis connections:', error);
  }

  // 5. Close NestJS application
  await app.close();
  bootstrapLogger.log('Application closed successfully');
  process.exit(0);
};
```

## Kubernetes Integration

### Termination Grace Period

The deployment specifies a termination grace period:

```yaml
terminationGracePeriodSeconds: 45
```

This gives the pod 45 seconds to shut down gracefully before Kubernetes forcefully terminates it.

### Pre-Stop Hook

The deployment includes a pre-stop hook:

```yaml
lifecycle:
  preStop:
    exec:
      command:
        - sh
        - -c
        - sleep 15 && kill -TERM 1
```

**Sequence**:

1. Kubernetes sends SIGTERM to the pod
2. Pre-stop hook sleeps for 15 seconds (allows load balancer to remove pod)
3. Pre-stop hook sends SIGTERM to the application
4. Application has 30 seconds to shut down gracefully
5. Kubernetes forcefully terminates after 45 seconds total

### Load Balancer Coordination

When a pod is terminating:

1. **Kubernetes removes pod from service endpoints** (immediately)
2. **Nginx removes pod from upstream** (within 15 seconds)
3. **In-flight requests complete** (within 30 seconds)
4. **Pod terminates** (after 45 seconds)

This ensures:

- No new requests are routed to the terminating pod
- Existing requests complete gracefully
- No connection errors for clients

## Database Connection Cleanup

### TypeORM Connection Cleanup

```typescript
const dataSource = app.get('DataSource');
if (dataSource?.isInitialized) {
  await dataSource.destroy();
}
```

This:

- Closes all active database connections
- Releases connection pool resources
- Flushes pending transactions
- Cleans up prepared statements

### Connection Pool Draining

Before closing connections, the application:

1. Stops accepting new queries
2. Waits for in-flight queries to complete
3. Closes idle connections
4. Closes remaining connections

### Transaction Rollback

Any uncommitted transactions are rolled back:

```typescript
// Automatic rollback on connection close
await dataSource.destroy();
```

## Redis Connection Cleanup

### Redis Disconnection

```typescript
const redisService = app.get('RedisService');
if (redisService?.disconnect) {
  await redisService.disconnect();
}
```

This:

- Closes Redis connections
- Flushes pending commands
- Releases memory
- Cleans up subscriptions

### Cache Invalidation

Before shutdown, consider invalidating critical caches:

```typescript
// Optional: Clear critical caches
await redisService.flushdb();
```

## Testing Graceful Shutdown

### Local Testing

```bash
# Start the application
npm run start:prod

# In another terminal, send SIGTERM
kill -TERM <pid>

# Observe logs for graceful shutdown sequence
```

### Docker Testing

```bash
# Start container
docker run -it chioma-backend:latest

# In another terminal, stop container
docker stop <container-id>

# Observe logs for graceful shutdown sequence
```

### Kubernetes Testing

```bash
# Delete a pod to trigger graceful shutdown
kubectl delete pod <pod-name> -n production

# Watch pod termination
kubectl get pods -n production -w

# Check logs for graceful shutdown
kubectl logs <pod-name> -n production
```

### Load Testing During Shutdown

```bash
# Start load test
npm run perf:load

# In another terminal, trigger shutdown
kill -TERM <pid>

# Observe that in-flight requests complete without errors
```

## Monitoring Graceful Shutdown

### Metrics

Track graceful shutdown metrics:

```typescript
// Add metrics for shutdown monitoring
const shutdownDuration = new Gauge({
  name: 'graceful_shutdown_duration_seconds',
  help: 'Time taken for graceful shutdown',
});

const activeConnectionsAtShutdown = new Gauge({
  name: 'active_connections_at_shutdown',
  help: 'Number of active connections when shutdown started',
});
```

### Logs

Monitor shutdown logs:

```bash
# Watch for shutdown logs
kubectl logs -n production -l app=chioma-backend -f | grep -i shutdown

# Check for timeout warnings
kubectl logs -n production -l app=chioma-backend | grep "timeout exceeded"

# Check for connection errors
kubectl logs -n production -l app=chioma-backend | grep "connection"
```

### Alerts

Set up alerts for shutdown issues:

```yaml
- alert: GracefulShutdownTimeout
  expr: graceful_shutdown_duration_seconds > 40
  for: 1m
  labels:
    severity: warning
  annotations:
    summary: 'Graceful shutdown took longer than expected'
```

## Best Practices

### 1. Set Appropriate Timeouts

```bash
# Development: 10 seconds
GRACEFUL_SHUTDOWN_TIMEOUT=10000

# Production: 30 seconds
GRACEFUL_SHUTDOWN_TIMEOUT=30000
```

### 2. Coordinate with Load Balancer

Ensure load balancer removes pod before shutdown:

```yaml
# Kubernetes removes pod from endpoints immediately
# Nginx removes pod within 15 seconds (pre-stop hook)
# Application has 30 seconds to shut down
# Total: 45 seconds (terminationGracePeriodSeconds)
```

### 3. Handle Long-Running Requests

For endpoints with long-running requests:

```typescript
// Implement request timeout
@UseInterceptors(TimeoutInterceptor)
@Post('/long-operation')
async longOperation() {
  // This will be interrupted if shutdown is triggered
}
```

### 4. Drain Connection Pools

Ensure connection pools are drained:

```typescript
// Wait for all connections to close
while (activeConnections > 0) {
  await new Promise((resolve) => setTimeout(resolve, 1000));
}
```

### 5. Log Shutdown Events

Log all shutdown events for debugging:

```typescript
bootstrapLogger.log(`Received ${signal}, starting graceful shutdown...`);
bootstrapLogger.log(`Waiting for ${activeConnections} active connections...`);
bootstrapLogger.log('Database connections closed');
bootstrapLogger.log('Application closed successfully');
```

## Troubleshooting

### Issue: Shutdown Takes Too Long

**Symptoms**: Pod takes > 45 seconds to terminate

**Causes**:

- Long-running requests not completing
- Database queries hanging
- Redis operations blocking

**Solution**:

```bash
# Increase termination grace period
terminationGracePeriodSeconds: 60

# Reduce graceful shutdown timeout
GRACEFUL_SHUTDOWN_TIMEOUT=20000

# Investigate slow requests
kubectl logs <pod-name> -n production | grep "duration"
```

### Issue: Connections Not Closing

**Symptoms**: "Waiting for X active connections" logs continue

**Causes**:

- WebSocket connections not closing
- Long-polling requests
- Streaming responses

**Solution**:

```typescript
// Force close connections after timeout
if (elapsed > shutdownTimeout) {
  server.close(() => {
    // Force close all connections
    server.closeAllConnections();
  });
}
```

### Issue: Database Transactions Not Rolling Back

**Symptoms**: Uncommitted transactions after shutdown

**Causes**:

- Transactions not properly closed
- Connection pool not draining

**Solution**:

```typescript
// Ensure all transactions are rolled back
const dataSource = app.get('DataSource');
const queryRunner = dataSource.createQueryRunner();
await queryRunner.rollbackTransaction();
await dataSource.destroy();
```

### Issue: Redis Data Loss

**Symptoms**: Cache data lost after shutdown

**Causes**:

- Redis not flushing pending commands
- Connection closed before writes complete

**Solution**:

```typescript
// Flush Redis before closing
const redisService = app.get('RedisService');
await redisService.flushdb();
await redisService.disconnect();
```

## References

- [Node.js Process Signals](https://nodejs.org/en/docs/guides/nodejs-graceful-shutdown/)
- [Kubernetes Pod Lifecycle](https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/)
- [Docker Container Signals](https://docs.docker.com/engine/reference/commandline/stop/)
- [NestJS Lifecycle Events](https://docs.nestjs.com/fundamentals/lifecycle-events)
