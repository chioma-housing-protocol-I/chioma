type RouteLoadingProps = {
  rows?: number;
};

/**
 * Generic section-local loading skeleton for route groups that render inside
 * a persistent shell layout (nav/sidebar), where a full-page spinner would
 * flash awkwardly inside that shell. `app/loading.tsx` and
 * `app/user/loading.tsx` keep their own bespoke treatments; this is for the
 * route groups that had no loading.tsx at all.
 */
export default function RouteLoading({ rows = 3 }: RouteLoadingProps) {
  return (
    <div className="space-y-6 p-6 animate-pulse" role="status" aria-label="Loading">
      <div className="h-6 w-48 rounded bg-neutral-200" />
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-neutral-100" />
        ))}
      </div>
    </div>
  );
}
