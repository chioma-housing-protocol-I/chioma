# Feature Flag & Gradual Rollout Guide

This document describes how feature flags and percentage-based rollouts work in this repository, how to create new flags, safely adjust rollout percentages, and trigger emergency kill switches during incidents.

---

## Overview

The feature flag system allows engineering and product teams to decouple software deployment from feature release. Rather than deploying code to 100% of users at once, features can be gradually rolled out (e.g., 5% -> 25% -> 50% -> 100%), monitored, and toggled instantly without a redeployment.

### Key Principles & Features

- **Deterministic Per-User Bucketing:** Built with a SHA-256 hash algorithm mapping `${userId}:${flagKey}` to integer buckets `0–99`. The same user will consistently see or not see the feature across requests and sessions for a given rollout percentage.
- **Dynamic Administrative API:** Rollout percentages and enabled states can be modified at runtime via admin endpoints or database updates.
- **Emergency Kill Switch:** Immediate deactivation (`enabled: false` or `rolloutPercentage: 0`) disables the feature for 100% of users without requiring code rollbacks or build pipelines.
- **Sub-millisecond Performance:** Feature flags are cached in-memory and invalidated automatically on updates.

---

## Flag Data Structure

Each feature flag object contains the following attributes:

| Field               | Type    | Description                                                                             |
| ------------------- | ------- | --------------------------------------------------------------------------------------- |
| `key`               | String  | Unique identifier for the flag (e.g., `new_payment_gateway`, `enhanced_status_metrics`) |
| `description`       | String  | Human-readable purpose of the flag                                                      |
| `enabled`           | Boolean | Master switch (`true` = active, `false` = disabled for ALL users)                       |
| `rolloutPercentage` | Integer | Percentage of users enabled (0 to 100)                                                  |
| `metadata`          | JSON    | Optional additional configuration attributes or targeting parameters                    |

---

## How to Add a New Flag

### 1. Register the Flag via API or Database Seed

Create the feature flag via the Admin API:

```bash
curl -X POST http://localhost:3000/admin/feature-flags \
  -H "Content-Type: application/json" \
  -d '{
    "key": "new_checkout_flow",
    "description": "Gradual rollout of redesigned checkout page",
    "enabled": true,
    "rolloutPercentage": 10
  }'
```

### 2. Guard Feature Logic in Code

#### Server-Side (NestJS Services & Controllers)

Inject `FeatureFlagsService` into your NestJS module/service:

```typescript
import { FeatureFlagsService } from "../feature-flags/feature-flags.service";

@Injectable()
export class OrderService {
  constructor(private readonly featureFlagsService: FeatureFlagsService) {}

  async processOrder(userId: string, orderData: any) {
    const isNewCheckoutEnabled =
      await this.featureFlagsService.isFeatureEnabled(
        "new_checkout_flow",
        userId,
      );

    if (isNewCheckoutEnabled) {
      return this.processNewCheckout(userId, orderData);
    }

    return this.processLegacyCheckout(userId, orderData);
  }
}
```

#### Client-Side (React/Frontend)

Query feature flag state from the evaluation endpoint `/feature-flags/eval`:

```typescript
// Example fetch helper
async function checkFeatureFlag(
  flagKey: string,
  userId?: string,
): Promise<boolean> {
  const params = new URLSearchParams({ key: flagKey });
  if (userId) params.append("userId", userId);

  const res = await fetch(`/feature-flags/eval?${params.toString()}`);
  const data = await res.json();
  return data.isEnabled;
}
```

---

## How to Change Rollout Percentage Safely

Recommended gradual rollout sequence:

1. **Internal / Staging Testing:** `rolloutPercentage: 0` (or target specific user IDs in metadata).
2. **Canary Release (5%):** Monitor error rates, Sentry alerts, latency metrics.
3. **Partial Rollout (25%):** Verify database loads and performance benchmarks under real user traffic.
4. **Majority Rollout (50%):** Confirm stability.
5. **Full Release (100%):** Enable for all users.

### API Command to Update Percentage:

```bash
curl -X PATCH http://localhost:3000/admin/feature-flags/new_checkout_flow/rollout \
  -H "Content-Type: application/json" \
  -d '{
    "rolloutPercentage": 25
  }'
```

---

## Incident Management & Kill Switch

If an incident, severe bug, performance degradation, or data corruption is detected with a flagged feature:

### Execute Emergency Kill Switch Immediately

Use the dedicated kill switch endpoint to disable the feature instantly across all nodes:

```bash
curl -X POST http://localhost:3000/admin/feature-flags/new_checkout_flow/kill
```

**What this does:**

1. Sets `enabled = false` and `rolloutPercentage = 0` in the database.
2. Invalidates in-memory flag caches immediately across the application cluster.
3. All subsequent calls to `isFeatureEnabled('new_checkout_flow')` immediately return `false`, instantly routing traffic away from the broken feature without requiring a redeployment or service restart.

---

## Local Development & Testing

### Running Feature Flag Unit Tests

```bash
pnpm --dir backend run test -- --testPathPattern=feature-flags
```
