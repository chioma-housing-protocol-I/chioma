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
    <div className="bg-white/5 backdrop-blur-sm p-8 rounded-3xl border border-white/10 shadow-xl flex flex-col md:flex-row gap-10 items-center md:items-start overflow-hidden relative">
      <div className="absolute -left-20 -bottom-20 w-64 h-64 rounded-full bg-blue-600 blur-[100px] opacity-10" />

      {/* Target Overall Average Rating Display */}
      <div className="flex flex-col items-center justify-center shrink-0 min-w-[160px] relative z-10">
        <h3 className="text-6xl font-black text-white tracking-tighter mb-4">
          {average.toFixed(1)}
        </h3>
        <div className="mb-4 pt-4 border-t border-white/5 w-full flex justify-center">
          <StarRatingInput
            value={Math.round(average)}
            onChange={() => {}}
            readOnly
            size="md"
          />
        </div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-blue-200/40">
          Based on {total} {total === 1 ? 'review' : 'reviews'}
        </p>
      </div>

      {/* Vertical divider on desktop, horizontal on mobile */}
      <div className="h-px w-full md:w-px md:h-40 bg-white/5 shrink-0 relative z-10" />

      {/* Progress Bars for each star */}
      <div className="flex-1 w-full flex flex-col gap-4 justify-center relative z-10">
        {[5, 4, 3, 2, 1].map((star) => {
          const count = distribution[star as keyof RatingStats['distribution']];
          const percentage = total > 0 ? Math.round((count / total) * 100) : 0;

          return (
            <div key={star} className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 w-10 shrink-0 justify-end">
                <span className="text-[10px] font-bold text-blue-200/60">
                  {star}
                </span>
                <Star className="w-3 h-3 fill-amber-400 text-amber-400 opacity-40" />
              </div>
              <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden border border-white/5 p-[1px]">
                <div
                  className="h-full bg-gradient-to-r from-amber-400 to-orange-400 rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(251,191,36,0.2)]"
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <div className="w-14 shrink-0 text-[10px] font-bold text-blue-200/40 text-right tracking-widest uppercase">
                {percentage}%
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
