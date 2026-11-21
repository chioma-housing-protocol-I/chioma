'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';

interface Props {
  onNext: (data: { specialRequests: string }) => void;
  onPrevious: () => void;
  isLoading?: boolean;
}

export function BookingStep2({ onNext, onPrevious, isLoading = false }: Props) {
  const [specialRequests, setSpecialRequests] = useState('');

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Any special requests?</h2>
      <p className="text-blue-200/60">
        Let the host know if you have any specific needs.
      </p>
      <textarea
        value={specialRequests}
        onChange={(e) => setSpecialRequests(e.target.value)}
        rows={5}
        disabled={isLoading}
        placeholder="e.g. early check-in, ground floor room, allergies..."
        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-blue-300/30 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none disabled:opacity-50"
      />
      <div className="flex gap-3">
        <button
          onClick={onPrevious}
          disabled={isLoading}
          className="flex-1 py-3 bg-white/10 border border-white/10 rounded-xl font-semibold hover:bg-white/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Back
        </button>
        <button
          onClick={() => onNext({ specialRequests })}
          disabled={isLoading}
          className="flex-1 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl font-semibold hover:from-blue-600 hover:to-indigo-700 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              Saving...
            </>
          ) : (
            'Continue'
          )}
        </button>
      </div>
    </div>
  );
}
