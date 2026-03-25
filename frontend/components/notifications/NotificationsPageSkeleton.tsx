function SkeletonRow() {
  return (
    <div className="flex items-start gap-3 px-4 py-4 animate-pulse">
      <div className="shrink-0 w-9 h-9 bg-white/10 rounded-full" />
      <div className="flex-1 min-w-0 space-y-2">
        <div className="h-4 bg-white/10 rounded w-2/5" />
        <div className="h-3 bg-white/5 rounded w-4/5" />
        <div className="h-3 bg-white/5 rounded w-1/4" />
      </div>
      <div className="shrink-0 h-4 bg-white/10 rounded w-14 mt-0.5" />
    </div>
  );
}

export default function NotificationsPageSkeleton() {
  return (
    <div className="max-w-3xl mx-auto animate-pulse">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="space-y-2">
          <div className="h-7 bg-white/10 rounded w-40" />
          <div className="h-4 bg-white/5 rounded w-56" />
        </div>
        <div className="h-4 bg-white/10 rounded w-28" />
      </div>

      {/* Filter pills */}
      <div className="flex items-center gap-2 mb-6">
        <div className="w-4 h-4 bg-white/10 rounded" />
        {[16, 20, 24, 18].map((w, i) => (
          <div
            key={i}
            className="h-8 bg-white/10 rounded-full"
            style={{ width: `${w * 4}px` }}
          />
        ))}
      </div>

      {/* List */}
      <div className="backdrop-blur-sm bg-white/5 rounded-xl border border-white/10 divide-y divide-white/5 overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonRow key={i} />
        ))}
      </div>
    </div>
  );
}
