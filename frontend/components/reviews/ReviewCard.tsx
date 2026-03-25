import Image from 'next/image';
import { formatDistanceToNow } from 'date-fns';
import { User, ShieldCheck } from 'lucide-react';
import { StarRatingInput } from './StarRatingInput';

export interface Review {
  id: string;
  rating: number;
  comment: string;
  createdAt: string | Date;
  author: {
    id: string;
    name: string;
    avatar?: string;
    isVerified?: boolean;
    role?: 'TENANT' | 'LANDLORD';
  };
}

interface ReviewCardProps {
  review: Review;
}

export function ReviewCard({ review }: ReviewCardProps) {
  const dateStr =
    typeof review.createdAt === 'string'
      ? review.createdAt
      : review.createdAt.toISOString();
  const timeAgo = formatDistanceToNow(new Date(dateStr), { addSuffix: true });

  return (
    <div className="bg-white/5 backdrop-blur-sm p-6 rounded-2xl border border-white/10 shadow-xl hover:bg-white/10 transition-all duration-300 group">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-linear-to-tr from-blue-600 to-indigo-600 overflow-hidden flex items-center justify-center shrink-0 border border-white/10 shadow-lg">
            {review.author.avatar ? (
              <Image
                src={review.author.avatar}
                alt={review.author.name}
                width={48}
                height={48}
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="text-white w-5 h-5 opacity-80" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-white group-hover:text-blue-400 transition-colors">
                {review.author.name}
              </h4>
              {review.author.isVerified && (
                <ShieldCheck className="w-4 h-4 text-blue-400" />
              )}
            </div>
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-blue-200/40">
              {review.author.role && (
                <span className="text-blue-400">
                  {review.author.role.toLowerCase()}
                </span>
              )}
              {review.author.role && <span className="opacity-30">•</span>}
              <time dateTime={dateStr} className="opacity-60">
                {timeAgo}
              </time>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end">
          <StarRatingInput
            value={review.rating}
            onChange={() => {}}
            readOnly
            size="sm"
          />
        </div>
      </div>

      <p className="text-blue-200/60 leading-relaxed text-sm font-medium">
        {review.comment}
      </p>
    </div>
  );
}
