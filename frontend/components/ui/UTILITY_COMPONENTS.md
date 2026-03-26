# Utility Components

This folder contains reusable utility UI building blocks used across the frontend.

## Components

- `LoadingSpinner`: inline/full-screen loading indicator with size and color variants.
- `ErrorBoundary`: client error boundary with shared fallback UI.
- `EmptyState`: standardized empty-state card with optional icon and action.
- `SkeletonLoader`: `text`, `card`, `avatar`, and `table-row` variants.
- `ToastProvider` + `notify`: shared toast configuration and helper methods.
- `ConfirmDialog`: confirmation modal for destructive/important actions.
- `Tooltip`: simple hover/focus tooltip helper.
- `Pagination`: accessible page navigation with ellipsis handling.

## Usage

Import from the `ui` barrel:

```tsx
import { LoadingSpinner, notify, Pagination } from '@/components/ui';
```

Use shared toast helpers instead of direct `react-hot-toast` calls in new code:

```tsx
notify.success('Saved successfully');
notify.error('Request failed');
```
