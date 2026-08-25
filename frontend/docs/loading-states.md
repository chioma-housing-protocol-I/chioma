# Loading states

Three different situations need three different loading treatments. Picking the
wrong one is why the same kind of page has ended up looking different depending
on which route you're on — this doc is the contract going forward.

## 1. Route transition

**When:** the router is switching to a new route segment (framework-driven, via
Next.js `loading.tsx`).

**Treatment:** `app/loading.tsx`, `app/<segment>/loading.tsx`. These are
automatic Suspense fallbacks — you don't render them yourself. Mirror the
destination layout when one exists for the segment (see
`app/user/loading.tsx`, which reproduces the dashboard's KPI/chart/table
shape) so there's no layout jump when real content mounts.

## 2. In-place content load / refresh

**When:** the page is already mounted and a content _region_ is fetching or
refetching (initial `useQuery` load, tab switch, filter change, pagination,
infinite scroll). The page chrome (header, tabs, nav) stays put — only the
data-driven region is pending.

**Treatment:** render a skeleton that mirrors the shape of the content that's
about to appear, in the same region, at the same size. Never a bare spinner
here — a spinner has no shape, so content "pops" into a different-sized area
than the spinner occupied, and it reads as a different (lesser) loading
experience than a skeleton-driven page doing the exact same job next to it.

Pick the skeleton by what the region actually contains:

- **Image-card grid** (property/listing/trip cards) →
  `components/properties/PropertyCardSkeleton`. Render one per expected card
  inside the same grid classes the real content uses. This is already the
  established pattern in `app/properties/page.tsx` — reuse it, don't
  reinvent a new card skeleton per page.
- **Vertical list of non-image info cards** (bookings, reviews, sublet
  requests) → `components/ui/SkeletonCard`. Stack a few inside `space-y-4`.
- **Small compact list** (a sidebar picker, a handful of rows) → a couple of
  inline pulse divs sized to the real row, matching the pattern already used
  in `app/user/loading.tsx`. Don't reach for a shared component for a
  one-off 3-row sidebar.
- **A single stat/info card** → an inline skeleton that mirrors that one
  card's structure (icon block + text lines). One-off, so it's written
  inline rather than factored out.
- **Single-record detail page with no list/grid shape** (e.g.
  `app/stays/[id]/page.tsx`) → `LoadingSpinner` is an accepted exception
  here. There's no shape to mirror for "one property's full detail page";
  don't force a skeleton where there's nothing repeating to approximate.

`components/loading/*` (`Spinner`, `Shimmer`, `ListSkeleton`,
`SkeletonLoader`, `ProgressBar`) is a light-themed kit for the app's light
surfaces. `PropertyCardSkeleton` / `SkeletonCard` are dark-glass
(`bg-slate-800/50`, `border-white/10`) to match the marketplace surfaces
(stays/guest/host/sublet). Match the kit to the section's theme — that
mismatch is why the light-themed kit went unused and pages fell back to ad
hoc spinners.

## 3. Blocking action

**When:** a user-initiated mutation must finish before the UI is safe to
touch again (form submit, approve/decline, payment) — not a background
refresh.

**Treatment:** scope the indicator to the control that triggered it.

- One button triggers it → `components/loading/LoadingButton` (spinner
  replaces/joins the label, button disables itself). See
  `app/host/bookings/page.tsx` for the confirm/decline pattern.
- The whole screen must block (e.g. payment in flight) →
  `components/loading/LoadingOverlay`.
- Loading state needs to be shared across components that don't directly
  own the button (e.g. disabling a whole form section from a child
  action) → `useLoading` / `useLoadingStore` (`hooks/use-loading.ts`,
  `store/loading-store.ts`) with a stable key from `LOADING_KEYS`. See
  `app/user/profile/page.tsx` and `app/developer/webhooks/page.tsx` for
  this pattern.

Don't use the global `loading-store` for a loading flag that only one
component reads — that's what local `useState`/`isPending` (react-query
mutations already give you this) is for. Reach for the store only when the
flag needs to be read somewhere the trigger isn't.
