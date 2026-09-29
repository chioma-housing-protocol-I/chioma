import { useState } from 'react';
import Image from 'next/image';
import { formatDistanceToNow } from 'date-fns';
import { useDateFnsLocale } from '@/lib/utils/date-fns-locale';
import { User, ShieldCheck, MessageSquare } from 'lucide-react';
import { StarRatingInput } from './StarRatingInput';

export interface Review {
  id: string;
  rating: number;
  comment: string;
  createdAt: string | Date;
  /** Public response from the reviewed host/landlord. */
  response?: string | null;
  respondedAt?: string | Date | null;
  author: {
    id: string;
    name: string;
    avatar?: string;
    isVerified?: boolean;
    role?: 'USER' | 'ADMIN';
  };
}

interface ReviewCardProps {
  review: Review;
  /** True when the current user is the reviewed party and may respond. */
  canRespond?: boolean;
  onRespond?: (reviewId: string, response: string) => Promise<void>;
}

export function ReviewCard({ review, canRespond, onRespond }: ReviewCardProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(review.response ?? '');
  const [saving, setSaving] = useState(false);

  const submitResponse = async () => {
    if (!onRespond || !draft.trim()) return;
    setSaving(true);
    try {
      await onRespond(review.id, draft.trim());
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const dateStr =
    typeof review.createdAt === 'string'
      ? review.createdAt
      : review.createdAt.toISOString();
  const dateFnsLocale = useDateFnsLocale();
  const timeAgo = formatDistanceToNow(new Date(dateStr), {
    addSuffix: true,
    locale: dateFnsLocale,
  });

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

      {review.response && !editing && (
        <div className="mt-4 ml-4 pl-4 border-l-2 border-blue-500/40">
          <p className="text-[10px] font-bold uppercase tracking-widest text-blue-400 mb-1">
            Response from host
          </p>
          <p className="text-blue-200/60 leading-relaxed text-sm">
            {review.response}
          </p>
        </div>
      )}

      {canRespond && onRespond && !editing && (
        <button
          type="button"
          onClick={() => {
            setDraft(review.response ?? '');
            setEditing(true);
          }}
          className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-blue-400 hover:text-blue-300"
        >
          <MessageSquare className="w-4 h-4" />
          {review.response ? 'Edit response' : 'Respond'}
        </button>
      )}

      {editing && (
        <div className="mt-4 space-y-2">
          <textarea
            aria-label="Your response"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={2000}
            rows={3}
            className="w-full rounded-lg bg-white/5 border border-white/10 p-3 text-sm text-white"
          />
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="px-3 py-1 text-xs text-blue-200/60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={submitResponse}
              disabled={saving || !draft.trim()}
              className="px-3 py-1 text-xs font-semibold rounded-md bg-blue-600 text-white disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save response'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
