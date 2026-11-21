'use client';

import { CreditCard, Wallet, Loader2 } from 'lucide-react';

interface Props {
  onNext: (data: { paymentMethod: string }) => void;
  onPrevious: () => void;
  isLoading?: boolean;
}

export function BookingStep3({ onNext, onPrevious, isLoading = false }: Props) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Choose payment method</h2>
      <div className="space-y-3">
        <button
          onClick={() => onNext({ paymentMethod: 'card' })}
          disabled={isLoading}
          className="w-full flex items-center gap-4 p-4 bg-white/5 border border-white/10 rounded-xl hover:border-blue-500/50 hover:bg-white/10 transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
            {isLoading ? (
              <Loader2 size={20} className="text-blue-400 animate-spin" aria-hidden="true" />
            ) : (
              <CreditCard size={20} className="text-blue-400" />
            )}
          </div>
          <div>
            <p className="font-semibold">Credit / Debit Card</p>
            <p className="text-sm text-blue-300/60">
              Pay securely with your card
            </p>
          </div>
        </button>
        <button
          onClick={() => onNext({ paymentMethod: 'stellar' })}
          disabled={isLoading}
          className="w-full flex items-center gap-4 p-4 bg-white/5 border border-white/10 rounded-xl hover:border-blue-500/50 hover:bg-white/10 transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center shrink-0">
            {isLoading ? (
              <Loader2 size={20} className="text-indigo-400 animate-spin" aria-hidden="true" />
            ) : (
              <Wallet size={20} className="text-indigo-400" />
            )}
          </div>
          <div>
            <p className="font-semibold">Stellar Wallet</p>
            <p className="text-sm text-blue-300/60">
              Pay with XLM via Freighter
            </p>
          </div>
        </button>
      </div>
      <button
        onClick={onPrevious}
        disabled={isLoading}
        className="w-full py-3 bg-white/10 border border-white/10 rounded-xl font-semibold hover:bg-white/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Back
      </button>
    </div>
  );
}
