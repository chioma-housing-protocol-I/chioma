export default function PropertyCardSkeleton() {
  return (
    <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white animate-pulse">
      {/* Image Skeleton */}
      <div className="relative h-60 sm:h-56 bg-gray-300" />

      {/* Content Skeleton */}
      <div className="p-4 sm:p-5">
        {/* Price Skeleton */}
        <div className="h-7 bg-gray-300 rounded w-32 mb-2" />

        {/* Title Skeleton */}
        <div className="h-5 bg-gray-300 rounded w-3/4 mb-2" />

        {/* Location Skeleton */}
        <div className="flex gap-2 mb-4">
          <div className="w-4 h-4 bg-gray-300 rounded shrink-0 mt-0.5" />
          <div className="h-4 bg-gray-300 rounded flex-1" />
        </div>

        {/* Features Skeleton */}
        <div className="flex gap-4 sm:gap-6 mb-4 pb-4 border-b border-gray-200">
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-gray-300 rounded" />
            <div className="h-4 bg-gray-300 rounded w-16" />
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-gray-300 rounded" />
            <div className="h-4 bg-gray-300 rounded w-16" />
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-gray-300 rounded" />
            <div className="h-4 bg-gray-300 rounded w-16" />
          </div>
        </div>

        {/* Manager Skeleton */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gray-300" />
          <div className="h-4 bg-gray-300 rounded w-32" />
        </div>
      </div>
    </div>
  );
}
