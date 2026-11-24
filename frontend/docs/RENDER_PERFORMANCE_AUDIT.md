# Render performance audit: property listing route

## Scope

This audit covers `frontend/app/properties/page.tsx`, `frontend/components/ui/VirtualGrid.tsx`, and `frontend/components/properties/PropertyCard.tsx`. It was produced for issue #2154.

## Method

React DevTools Profiler was used as the reference workflow: record an interaction, inspect which components committed, and repeat after each change. The static findings below were confirmed by reading the render path and by a route-level regression test that counts card renders when unrelated state changes.

Profiler workflow used for verification:

1. Open `/properties` with a populated listing response.
2. Start a React profiling session.
3. Scroll the listings panel, toggle list/split/map view, and drag the map divider.
4. Stop the session and inspect commits under `PropertyListing`, `VirtualGrid`, and `PropertyCard`.
5. Repeat the same interactions after the memoization changes and compare commit counts.

No numeric before/after timings are claimed here because Profiler timings vary by device and build mode. The regression test asserts the structural result: unchanged cards do not re-render on scroll or map-width changes.

## Findings

### 1. Unstable query-key input

`filterParams` was built as a fresh object on every render. `useInfiniteProperties` puts that object directly into its React Query key, so the key identity changed even when filter values did not. Memoizing the object on its four actual inputs removes the unstable identity.

### 2. Repeated page flattening and card adaptation

`data.pages.flatMap(...)` ran on every render, and `renderItem` called `toPropertyCardShape` again for every visible card. Since `PropertyCard` is already wrapped in `React.memo`, a freshly adapted property object defeated the bailout. Memoizing the flattened list and `renderItem` restores the intended behavior.

### 3. Fresh inline props on re-render

`VirtualGrid` receives `header`, `footer`, and `style` as fresh objects on every parent render. The map panel also received a fresh `properties` array and `initialViewState` object. These are now memoized at the route boundary, where their real dependencies are known.

### 4. Callback identity for the map panel

`handleBoundsChange`, `toggleMapCollapse`, and `adjustMapWidth` were recreated on every render. They are now `useCallback` wrappers with explicit dependencies.

## Changes applied

- Memoized `filterParams`, flattened properties, `mappedProperties`, and `initialMapViewState`.
- Memoized `listPanelStyle`, `mapPanelStyle`, `headerContent`, and `gridFooter`.
- Wrapped `renderItem` in `useCallback` with `gridColumns` as its only dependency.
- Wrapped map and layout callbacks in `useCallback`.
- Left `VirtualGrid` and `PropertyCard` public APIs unchanged.

## Retest

- Route-level regression test: `frontend/app/properties/__tests__/page.test.tsx` asserts stable query params and stable card rendering across scroll-driven re-renders.
- Unit suite: `pnpm --dir frontend test`.
- Lint: `pnpm --dir frontend lint`.
- Format: `pnpm --dir frontend format:check`.
- Build: `pnpm --dir frontend build`.
