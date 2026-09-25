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
- `CancelButton`: `Button` wrapper for cancelling in-flight requests.
- `Uploader`: drag-and-drop / click-to-browse file picker with a selected-files list.
- `VirtualList`: windowed renderer for long, single-column, fixed-row-height lists.
- `VirtualGrid`: windowed renderer for long, multi-column, responsive card grids (row-based windowing with an estimated row height). Used by unbounded/infinite-scroll result sets, e.g. the `/properties` listing grid.

## Ref forwarding convention

Every component in this folder that renders a single root DOM element must
use `React.forwardRef` and attach `displayName`, whether or not it wraps a
Radix primitive:

```tsx
export const Widget = React.forwardRef<HTMLDivElement, WidgetProps>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('...', className)} {...props} />
  ),
);
Widget.displayName = 'Widget';
```

This is required so parent components can compose these primitives the same
way as native elements and Radix parts — passing refs through for focus
management, `Tooltip`/`Popover` anchoring, and `asChild`/`Slot` merging.
Components that accept an `asChild` prop (e.g. `Button`) should merge with
`@radix-ui/react-slot`'s `Slot` rather than branching manually, so the ref
and props chain through correctly regardless of which element renders.

Do not export a bare function component from this folder if it renders a
single root node — wrap it in `forwardRef` even if nothing currently passes
it a ref. The cost is a few lines; the alternative is composition silently
breaking (ref warnings, broken tooltip anchors, broken focus-on-open) the
first time something needs it.

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
