import { Star } from 'lucide-react';
import { StarRatingInput } from './StarRatingInput';

export interface RatingStats {
  average: number;
  total: number;
  distribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
}

interface RatingSummaryProps {
  stats: RatingStats;
}

export function RatingSummary({ stats }: RatingSummaryProps) {
  const { average, total, distribution } = stats;

  return (
    <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-xs flex flex-col md:flex-row gap-8 items-center md:items-start">
      {/* Target Overall Average Rating Display */}
      <div className="flex flex-col items-center justify-center shrink-0 min-w-[160px]">
        <h3 className="text-5xl font-black text-gray-900 tracking-tighter mb-2">
          {average.toFixed(1)}
        </h3>
        <div className="mb-2">
          <StarRatingInput
            value={Math.round(average)}
            onChange={() => {}}
            readOnly
            size="md"
          />
        </div>
        <p className="text-sm font-medium text-gray-500">
          Based on {total} {total === 1 ? 'review' : 'reviews'}
        </p>
      </div>

      {/* Vertical divider on desktop, horizontal on mobile */}
      <div className="h-px w-full md:w-px md:h-auto bg-gray-100 shrink-0 hidden md:block" />

      {/* Progress Bars for each star */}
      <div className="flex-1 w-full flex flex-col gap-3 justify-center">
        {[5, 4, 3, 2, 1].map((star) => {
          const count = distribution[star as keyof RatingStats['distribution']];
          const percentage = total > 0 ? Math.round((count / total) * 100) : 0;

          return (
            <div key={star} className="flex items-center gap-3">
              <div className="flex items-center gap-1 w-8 shrink-0 justify-end">
                <span className="text-sm font-bold text-gray-700">{star}</span>
                <Star className="w-3.5 h-3.5 fill-gray-400 text-gray-400" />
              </div>
              <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-400 rounded-full transition-all duration-1000 ease-out"
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <div className="w-12 shrink-0 text-xs font-medium text-gray-500 text-right">
                {percentage}%
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
