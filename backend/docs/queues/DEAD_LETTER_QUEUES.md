# Dead Letter Queues (DLQ)

Production-ready handling for Bull jobs that exhaust all retry attempts.

## Overview

When a job on `email`, `documents`, `blockchain`, or `data-sync` queues fails after all configured retries, it is automatically moved to the **`dead-letter`** queue with full failure context. Operators can inspect, retry, or purge archived jobs via admin API endpoints.

## Flow

```
Worker queue job fails
        │
        ▼
Retries with exponential backoff (attempts configured per queue)
        │
        ▼ (all attempts exhausted)
DeadLetterQueueListener (@OnQueueFailed)
        │
        ▼
DeadLetterQueueService.moveToDeadLetter()
        │
        ├── Archive payload in `dead-letter` queue
        └── Remove job from source queue failed set
```

## Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `DEAD_LETTER_QUEUE_ENABLED` | Enable automatic DLQ routing | `true` |
| `DEAD_LETTER_RETENTION_DAYS` | Auto-purge archived jobs older than N days | `30` |

Set `DEAD_LETTER_QUEUE_ENABLED=false` in local dev if you do not want failed jobs moved.

## Admin API (JWT + admin role)

Base path: `/api/v1/queues`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/dead-letter/stats` | DLQ counts |
| GET | `/dead-letter/jobs` | List archived failed jobs |
| POST | `/dead-letter/jobs/:jobId/retry` | Re-queue job to original worker queue |
| POST | `/dead-letter/jobs/:jobId/remove` | Delete archived job |
| POST | `/dead-letter/purge` | Purge jobs older than retention period |

## Job defaults

Worker queue jobs now use `removeOnFail: false` so failed jobs remain available until moved to the DLQ. Completed jobs still use `removeOnComplete: true` (except blockchain audit trail).

## Retention

A daily cron (`EVERY_DAY_AT_4AM`) purges DLQ entries older than `DEAD_LETTER_RETENTION_DAYS`.

## Related

- Queue management controller: `src/modules/queues/controllers/queues.controller.ts`
- DLQ service: `src/modules/queues/services/dead-letter-queue.service.ts`
- [Error Notification & Escalation](../deployment/ERROR_NOTIFICATION_AND_ESCALATION.md)

## Testing

```bash
cd backend
pnpm exec jest src/modules/queues/services/dead-letter-queue.service.spec.ts --forceExit
pnpm exec jest src/modules/queues/services/dead-letter-queue.listener.spec.ts --forceExit
```
