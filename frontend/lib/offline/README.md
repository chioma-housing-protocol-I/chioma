# Offline Mode Implementation

This module provides comprehensive offline support for the Chioma application, enabling users to continue working without an internet connection.

## Features

### 1. IndexedDB Storage (`db.ts`)

- Local storage for critical data (properties, agreements, payments, maintenance requests)
- Sync queue for offline actions
- Conflict tracking and resolution
- Metadata storage for sync state

### 2. Sync Manager (`sync-manager.ts`)

- Automatic synchronization when connection is restored
- Batch processing of queued actions
- Retry logic with exponential backoff
- Progress tracking and error handling
- Conflict detection (HTTP 409 responses)

### 3. Conflict Resolution (`conflict-resolver.ts`)

- Multiple resolution strategies:
  - **Server Wins**: Always prefer server version (recommended)
  - **Client Wins**: Always prefer local version
  - **Last Write Wins**: Compare timestamps and use most recent
- Custom conflict handlers for entity-specific logic
- Manual conflict review and resolution

### 4. Cache Manager (`cache-manager.ts`)

- Entity-specific caching functions
- Priority-based caching (high, medium, low)
- Batch caching operations
- TTL support for cache expiration

### 5. React Hooks (`hooks.ts`)

- `useOfflineStatus()`: Track online/offline state, queue size, and conflicts
- `useSync()`: Manual sync trigger with progress tracking
- `useOfflineProperty()`, `useOfflineAgreement()`, `useOfflinePayment()`: Offline-aware data fetching
- `useCacheProperty()`, `useCacheAgreement()`, `useCachePayment()`: Cache mutations
- `useOfflineMutation()`: Queue mutations when offline
- `useConflicts()`: Manage conflict resolution

### 6. Background Sync (`background-sync.ts`)

- Service Worker integration for background sync
- Automatic sync on connection restore
- Periodic sync fallback (5-minute intervals)
- Last sync timestamp tracking

### 7. UI Components

- **OfflineIndicator**: Floating indicator showing online/offline status, queue size, and sync controls
- **ConflictResolutionModal**: UI for reviewing and resolving conflicts
- **NetworkStatusBanner**: Banner notification for offline state

## Usage

### Basic Setup

The offline functionality is automatically initialized in `StoreHydrator.tsx`:

```tsx
import { registerServiceWorker } from '@/lib/offline/register-sw';
import { setupAutoSync } from '@/lib/offline/background-sync';

useEffect(() => {
  registerServiceWorker();
  const cleanup = setupAutoSync();
  return cleanup;
}, []);
```

### Using Offline Hooks

```tsx
import {
  useOfflineStatus,
  useSync,
  useOfflineProperties,
} from '@/lib/offline/hooks';

function MyComponent() {
  const { isOnline, queueSize, hasConflicts } = useOfflineStatus();
  const { sync, isSyncing } = useSync();
  const { data: properties } = useOfflineProperties();

  return (
    <div>
      {!isOnline && <p>You are offline</p>}
      {queueSize > 0 && <p>{queueSize} actions pending</p>}
      <button onClick={sync} disabled={isSyncing}>
        Sync Now
      </button>
    </div>
  );
}
```

### Caching Data

```tsx
import { useCacheProperty } from '@/lib/offline/hooks';

function PropertyDetail({ property }) {
  const { mutate: cacheProperty } = useCacheProperty();

  useEffect(() => {
    // Cache property for offline access
    cacheProperty(property);
  }, [property, cacheProperty]);

  return <div>{/* Property details */}</div>;
}
```

### Offline Mutations

```tsx
import { useOfflineMutation } from '@/lib/offline/hooks';

function CreatePropertyForm() {
  const mutation = useOfflineMutation('properties', 'create');

  const handleSubmit = (data) => {
    mutation.mutate(data); // Queued if offline, executed immediately if online
  };

  return <form onSubmit={handleSubmit}>{/* Form fields */}</form>;
}
```

## Architecture

### Data Flow

1. **Online Mode**:
   - API requests → Server
   - Responses cached in IndexedDB
   - React Query cache updated

2. **Offline Mode**:
   - Mutations → Sync Queue (IndexedDB)
   - Queries → IndexedDB cache
   - UI shows offline indicator

3. **Connection Restored**:
   - Auto-sync triggered
   - Sync queue processed in batches
   - Conflicts detected and stored
   - React Query cache invalidated

### Storage Structure

```
IndexedDB: chioma_offline
├── properties (cached property data)
├── agreements (cached agreement data)
├── payments (cached payment data)
├── maintenance (cached maintenance requests)
├── notifications (cached notifications)
├── sync_queue (pending actions)
├── conflicts (unresolved conflicts)
└── metadata (sync state, timestamps)
```

## Service Worker

The service worker (`public/sw.js`) provides:

- Static asset caching
- Runtime caching for API responses
- Background sync registration
- Offline fallback pages

### Caching Strategy

- **Static Assets**: Cache-first
- **API Requests**: Network-only (with offline fallback)
- **HTML Pages**: Network-first, fallback to cache

## Testing

Run tests with:

```bash
pnpm test
```

Tests cover:

- IndexedDB operations
- Sync manager functionality
- Conflict resolution strategies
- Hook behavior

## Configuration

### Sync Settings

Adjust sync behavior in `sync-manager.ts`:

```typescript
const DEFAULT_MAX_RETRIES = 3;
const SYNC_BATCH_SIZE = 10;
```

### Cache Priority

Configure cache priority in `cache-manager.ts`:

```typescript
const CACHE_PRIORITIES = {
  high: ['properties', 'agreements', 'payments'],
  medium: ['maintenance', 'notifications'],
  low: [],
};
```

### Sync Interval

Adjust periodic sync interval in `background-sync.ts`:

```typescript
const SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
```

## Best Practices

1. **Cache Critical Data**: Cache data that users need offline (properties, agreements, payments)
2. **Handle Conflicts**: Always provide a conflict resolution strategy
3. **Show Feedback**: Use the offline indicator to keep users informed
4. **Test Offline**: Test your app with DevTools offline mode
5. **Monitor Queue**: Keep an eye on sync queue size to detect issues

## Troubleshooting

### Sync Not Working

1. Check if service worker is registered: `navigator.serviceWorker.controller`
2. Verify IndexedDB is accessible: Open DevTools → Application → IndexedDB
3. Check sync queue: `getSyncQueueSize()`

### Conflicts Not Resolving

1. Check conflict resolution strategy
2. Verify server returns proper 409 status for conflicts
3. Review conflict records: `getConflictsForReview()`

### Cache Not Updating

1. Verify cache functions are called after data fetch
2. Check IndexedDB storage quota
3. Clear cache if corrupted: `clearStore(STORES.PROPERTIES)`

## Future Enhancements

- [ ] Differential sync (only sync changed fields)
- [ ] Compression for large cached data
- [ ] Selective sync (user chooses what to sync)
- [ ] Conflict preview before resolution
- [ ] Offline analytics and usage tracking
- [ ] Push notifications for sync completion
