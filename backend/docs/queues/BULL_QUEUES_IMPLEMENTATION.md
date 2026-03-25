# Bull Job Queues Implementation Guide

## Overview

This document describes the Bull job queue implementation for the Chioma Housing Protocol backend. Bull is a robust, production-ready job queue library for Node.js that uses Redis as its backing store.

## Architecture

### Queue Types

The implementation includes four specialized queues:

1. **Email Queue** (`email`)
   - Handles email sending operations
   - Job types: verification, password-reset, notification, alert
   - Retry: 3 attempts with exponential backoff (1s → 2s → 4s)

2. **Documents Queue** (`documents`)
   - Handles document and image processing
   - Job types: process-image, generate-thumbnail, convert-format, extract-metadata
   - Retry: 3 attempts with exponential backoff (3s → 6s → 12s)

3. **Blockchain Queue** (`blockchain`)
   - Handles blockchain transactions and smart contract interactions
   - Job types: send-payment, create-escrow, release-escrow, mint-nft, sync-transaction, process-anchor-transaction
   - Retry: 5 attempts with exponential backoff (5s → 10s → 20s → 40s → 80s)
   - Jobs are kept for audit trail

4. **Data Sync Queue** (`data-sync`)
   - Handles data synchronization and maintenance tasks
   - Job types: sync-user-profile, sync-property-data, sync-agreement-status, sync-payment-status, cleanup-old-data, rebuild-search-index
   - Retry: 3 attempts with exponential backoff (2s → 4s → 8s)

## Configuration

### Environment Variables

Add these to your `.env` file:

```env
# Redis Configuration (choose one)
# Option 1: Upstash REST API (for serverless/Render)
REDIS_URL=https://your-upstash-redis-url.upstash.io
REDIS_TOKEN=your-upstash-token

# Option 2: Traditional Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your-password
REDIS_USERNAME=default
REDIS_TLS=false
```

### Module Setup

The `QueuesModule` is automatically imported in `app.module.ts` and provides:

- Bull queue registration
- Queue processors
- Monitoring service
- Management service
- Admin API endpoints

## Usage

### Adding Jobs to Queues

Inject `QueueManagementService` into your service:

```typescript
import { QueueManagementService } from '../queues/services/queue-management.service';

@Injectable()
export class AuthService {
  constructor(private queueManagementService: QueueManagementService) {}

  async registerUser(email: string, token: string): Promise<void> {
    // ... registration logic ...

    // Add email job to queue
    await this.queueManagementService.addEmailJob({
      type: 'verification',
      email,
      token,
    });
  }
}
```

### Email Queue Examples

```typescript
// Verification email
await queueManagementService.addEmailJob({
  type: 'verification',
  email: 'user@example.com',
  token: 'verification-token-123',
});

// Password reset email
await queueManagementService.addEmailJob({
  type: 'password-reset',
  email: 'user@example.com',
  token: 'reset-token-456',
});

// Notification email
await queueManagementService.addEmailJob({
  type: 'notification',
  email: 'user@example.com',
  subject: 'Payment Received',
  template: 'payment-notification',
  data: {
    title: 'Payment Received',
    message: 'Your rent payment has been received',
    amount: 1000,
    actionUrl: 'https://app.chioma.local/payments/123',
    actionText: 'View Payment',
  },
});

// Alert email
await queueManagementService.addEmailJob({
  type: 'alert',
  email: 'admin@example.com',
  subject: 'System Alert',
  data: {
    message: 'High number of failed transactions detected',
    details: { failedCount: 15, timeWindow: '1 hour' },
  },
});
```

### Document Queue Examples

```typescript
// Process image
await queueManagementService.addDocumentJob({
  type: 'process-image',
  fileKey: 's3://bucket/images/property-123.jpg',
  ownerId: 'user-uuid',
  fileName: 'property-123.jpg',
  contentType: 'image/jpeg',
});

// Generate thumbnail
await queueManagementService.addDocumentJob({
  type: 'generate-thumbnail',
  fileKey: 's3://bucket/images/property-123.jpg',
  ownerId: 'user-uuid',
  fileName: 'property-123.jpg',
  contentType: 'image/jpeg',
  options: { width: 200, height: 200 },
});
```

### Blockchain Queue Examples

```typescript
// Send payment
await queueManagementService.addBlockchainJob({
  type: 'send-payment',
  paymentId: 'payment-uuid',
  data: {
    fromAccount: 'GXXXXXX...',
    toAccount: 'GYYYYYY...',
    amount: '1000.00',
    asset: 'USDC',
  },
});

// Create escrow
await queueManagementService.addBlockchainJob({
  type: 'create-escrow',
  agreementId: 'agreement-uuid',
  data: {
    landlordAccount: 'GXXXXXX...',
    tenantAccount: 'GYYYYYY...',
    amount: '5000.00',
    duration: 30,
  },
});

// Mint NFT
await queueManagementService.addBlockchainJob({
  type: 'mint-nft',
  agreementId: 'agreement-uuid',
  data: {
    contractId: 'CXXXXXX...',
    metadata: {
      agreementNumber: 'AGR-2024-001',
      propertyAddress: '123 Main St',
      monthlyRent: '1000.00',
    },
  },
});
```

### Data Sync Queue Examples

```typescript
// Sync user profile
await queueManagementService.addDataSyncJob({
  type: 'sync-user-profile',
  entityId: 'user-uuid',
  data: { fields: ['firstName', 'lastName', 'email'] },
});

// Cleanup old data
await queueManagementService.addDataSyncJob({
  type: 'cleanup-old-data',
  data: { olderThanDays: 90 },
});

// Rebuild search index
await queueManagementService.addDataSyncJob({
  type: 'rebuild-search-index',
  entityType: 'properties',
});
```

### Job Options

All `add*Job` methods accept optional job options:

```typescript
await queueManagementService.addEmailJob(
  {
    type: 'verification',
    email: 'user@example.com',
    token: 'token-123',
  },
  {
    priority: 10, // Higher priority = processed first
    delay: 5000, // Delay job by 5 seconds
    attempts: 5, // Override default retry attempts
    backoff: {
      type: 'exponential',
      delay: 3000,
    },
    removeOnComplete: true, // Remove job after completion
    removeOnFail: false, // Keep failed jobs for debugging
  },
);
```

## Monitoring & Management

### Admin API Endpoints

All endpoints require JWT authentication and admin role.

#### Queue Statistics

```bash
# Get all queue statistics
GET /api/v1/queues/stats

# Get specific queue statistics
GET /api/v1/queues/:queueName/stats

# Response:
{
  "name": "email",
  "counts": {
    "active": 5,
    "wait": 12,
    "delayed": 3,
    "failed": 1,
    "completed": 1250
  },
  "failedCount": 1,
  "delayedCount": 3,
  "isPaused": false
}
```

#### Queue Health

```bash
# Get queue health status
GET /api/v1/queues/health

# Response:
{
  "timestamp": "2024-03-25T10:30:00Z",
  "queues": [
    {
      "timestamp": "2024-03-25T10:30:00Z",
      "queueName": "email",
      "active": 5,
      "waiting": 12,
      "delayed": 3,
      "failed": 1,
      "completed": 1250,
      "paused": false
    },
    ...
  ],
  "summary": {
    "totalActive": 15,
    "totalWaiting": 45,
    "totalDelayed": 8,
    "totalFailed": 3,
    "totalCompleted": 5000,
    "unhealthyQueues": []
  }
}
```

#### Dashboard Statistics

```bash
# Get dashboard statistics with history
GET /api/v1/queues/dashboard/stats

# Response includes metrics history for the last 60 minutes
```

#### Metrics History

```bash
# Get metrics history for a queue
GET /api/v1/queues/:queueName/metrics

# Response: Array of metrics with timestamps
```

#### Failed Jobs

```bash
# Get failed jobs for a queue
GET /api/v1/queues/:queueName/failed

# Response: Array of failed job objects
```

#### Job Details

```bash
# Get specific job details
GET /api/v1/queues/:queueName/jobs/:jobId

# Response:
{
  "id": "123",
  "data": { ... },
  "state": "failed",
  "progress": 0,
  "attempts": 3,
  "maxAttempts": 3,
  "failedReason": "Connection timeout",
  "stacktrace": [...],
  "createdAt": 1711353000000,
  "finishedAt": 1711353015000
}
```

#### Queue Control

```bash
# Pause a queue (stops processing new jobs)
POST /api/v1/queues/:queueName/pause

# Resume a queue
POST /api/v1/queues/:queueName/resume

# Clear a queue (removes all jobs)
POST /api/v1/queues/:queueName/clear

# Retry a failed job
POST /api/v1/queues/:queueName/jobs/:jobId/retry

# Remove a job
POST /api/v1/queues/:queueName/jobs/:jobId/remove
```

### Monitoring Service

The `QueueMonitoringService` automatically collects metrics every minute:

```typescript
// Get current metrics for a queue
const metrics = await queueMonitoringService.getCurrentMetrics('email');

// Get metrics history (last 100 entries)
const history = queueMonitoringService.getMetricsHistory('email', 100);

// Get all current metrics
const allMetrics = await queueMonitoringService.getAllCurrentMetrics();

// Get queue health
const health = await queueMonitoringService.getQueueHealth();

// Get dashboard stats
const stats = await queueMonitoringService.getDashboardStats();

// Clear old metrics (older than 60 minutes)
queueMonitoringService.clearOldMetrics(60);
```

## Error Handling & Retry Logic

### Retry Strategy

Each queue has a configured retry strategy:

- **Email**: 3 attempts, exponential backoff starting at 2s
- **Documents**: 3 attempts, exponential backoff starting at 3s
- **Blockchain**: 5 attempts, exponential backoff starting at 5s
- **Data Sync**: 3 attempts, exponential backoff starting at 2s

Failed jobs are logged and can be:
- Viewed via the admin API
- Retried manually
- Removed if unrecoverable

### Handling Job Failures

Processors should throw errors for failed jobs:

```typescript
@Process()
async handleEmailJob(job: Job<EmailJobData>): Promise<void> {
  try {
    // Process job
    await this.emailService.sendVerificationEmail(job.data.email, job.data.token);
  } catch (error) {
    this.logger.error(`Job ${job.id} failed: ${error.message}`);
    throw error; // Bull will retry based on configuration
  }
}
```

## Production Considerations

### Redis Setup

For production, use a managed Redis service:

- **Upstash**: Serverless Redis with REST API (recommended for Render)
- **AWS ElastiCache**: Managed Redis on AWS
- **Redis Cloud**: Managed Redis service
- **Self-hosted**: Redis server with replication and persistence

### Scaling

- **Horizontal Scaling**: Run multiple worker processes
- **Queue Prioritization**: Use job priorities for critical tasks
- **Rate Limiting**: Configure job processing rates per queue
- **Monitoring**: Set up alerts for failed jobs and queue backlog

### Persistence

- Enable Redis persistence (RDB or AOF)
- Regular backups of Redis data
- Monitor Redis memory usage
- Configure eviction policies

### Security

- Use strong Redis passwords
- Enable TLS for Redis connections
- Restrict Redis access to application servers
- Monitor Redis access logs

## Testing

### Unit Tests

```typescript
describe('QueueManagementService', () => {
  let service: QueueManagementService;
  let emailQueue: Queue;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QueueManagementService,
        {
          provide: getQueueToken('email'),
          useValue: {
            add: jest.fn(),
            getJobCounts: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<QueueManagementService>(QueueManagementService);
    emailQueue = module.get(getQueueToken('email'));
  });

  it('should add email job', async () => {
    const jobData = {
      type: 'verification' as const,
      email: 'test@example.com',
      token: 'token-123',
    };

    await service.addEmailJob(jobData);

    expect(emailQueue.add).toHaveBeenCalledWith(
      jobData,
      expect.objectContaining({
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
      }),
    );
  });
});
```

### Integration Tests

```typescript
describe('Email Queue Integration', () => {
  let app: INestApplication;
  let queueManagementService: QueueManagementService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [QueuesModule, NotificationsModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    queueManagementService = moduleFixture.get(QueueManagementService);
  });

  it('should process email job', async () => {
    const job = await queueManagementService.addEmailJob({
      type: 'verification',
      email: 'test@example.com',
      token: 'token-123',
    });

    // Wait for job processing
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const jobDetails = await queueManagementService.getJobDetails('email', job.id.toString());
    expect(jobDetails.state).toBe('completed');
  });
});
```

## Troubleshooting

### Queue Not Processing Jobs

1. Check Redis connection
2. Verify queue is not paused
3. Check processor logs for errors
4. Ensure job data is valid

### High Memory Usage

1. Reduce metrics history retention
2. Clear completed jobs more frequently
3. Monitor Redis memory usage
4. Configure Redis eviction policy

### Jobs Stuck in Active State

1. Check processor logs
2. Verify processor is running
3. Check for infinite loops in processor
4. Manually remove stuck jobs via API

### Redis Connection Issues

1. Verify Redis is running
2. Check connection credentials
3. Verify network connectivity
4. Check firewall rules

## References

- [Bull Documentation](https://github.com/OptimalBits/bull)
- [Redis Documentation](https://redis.io/documentation)
- [NestJS Bull Integration](https://docs.nestjs.com/techniques/queues)
- [Upstash Redis](https://upstash.com/docs/redis/overall/getstarted)
