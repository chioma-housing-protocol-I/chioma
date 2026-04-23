'use client';
import Link from 'next/link';
import { StarRating } from '@/components/common/StarRating';
import ReviewResponse from './ReviewResponse';

export default function ReviewDetail({ id }: { id: string }) {
  const mockReview = {
    id: '1',
    rating: 5,
    text: 'Great landlord!',
    tenant: 'Alice',
    date: '2026-03-25',
    response: null,
  };

  return (
    <div className="p-6 space-y-6">
      <Link href="/user/reviews" className="text-blue-400 hover:text-blue-300">
        ← Back to Reviews
      </Link>
      <div className="bg-slate-800/50 border border-white/10 rounded-2xl p-6 shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <StarRating value={mockReview.rating} readonly />
          <span className="text-sm text-slate-400">{mockReview.date}</span>
        </div>
        <p className="text-white text-lg mb-4">&quot;{mockReview.text}&quot;</p>
        <p className="text-slate-400 text-sm">Review by: {mockReview.tenant}</p>
      </div>
      <ReviewResponse reviewId={id} existingResponse={mockReview.response} />
    </div>
  );
}
