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
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs hover:shadow-md transition-shadow duration-300">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-linear-to-tr from-brand-blue to-blue-400 overflow-hidden flex items-center justify-center shrink-0">
            {review.author.avatar ? (
              <Image
                src={review.author.avatar}
                alt={review.author.name}
                width={48}
                height={48}
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="text-white w-6 h-6" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-gray-900">{review.author.name}</h4>
              {review.author.isVerified && (
                <ShieldCheck className="w-4 h-4 text-green-500" />
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              {review.author.role && (
                <span className="capitalize font-medium text-brand-blue">
                  {review.author.role.toLowerCase()}
                </span>
              )}
              {review.author.role && <span>•</span>}
              <time dateTime={dateStr}>{timeAgo}</time>
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

      <p className="text-gray-700 leading-relaxed">{review.comment}</p>
    </div>
  );
}
