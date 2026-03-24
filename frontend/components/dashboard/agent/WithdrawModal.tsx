'use client';

import React, { useState } from 'react';
import { X, Send, AlertCircle, Loader2 } from 'lucide-react';
import { getFreighterPublicKey } from '@/lib/stellar-auth';

interface WithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  currency: 'USDC' | 'XLM';
  balance: number;
}

export default function WithdrawModal({
  isOpen,
  onClose,
  currency,
  balance,
}: WithdrawModalProps) {
  const [address, setAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [status, setStatus] = useState<
    'idle' | 'connecting' | 'processing' | 'success' | 'error'
  >('idle');
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!address || !amount) {
      setErrorMessage('Please fill in all fields');
      setStatus('error');
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setErrorMessage('Please enter a valid amount');
      setStatus('error');
      return;
    }

    if (numAmount > balance) {
      setErrorMessage('Insufficient balance');
      setStatus('error');
      return;
    }

    try {
      setStatus('connecting');
      setErrorMessage('');

      // Connect to Freighter
      await getFreighterPublicKey();

      setStatus('processing');

      // Simulate transaction delay
      await new Promise((resolve) => setTimeout(resolve, 2000));

      setStatus('success');
      setTimeout(() => {
        onClose();
        setStatus('idle');
        setAmount('');
        setAddress('');
      }, 2000);
    } catch (err: unknown) {
      setStatus('error');
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Transaction failed. Please try again.');
      }
    }
  };

  const setMaxAmount = () => {
    setAmount(balance.toString());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={status !== 'processing' ? onClose : undefined}
      />

      {/* Modal Content */}
      <div className="relative w-full max-w-md bg-slate-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-xl font-bold text-white">Withdraw Funds</h2>
          <button
            onClick={onClose}
            disabled={status === 'processing'}
            className="p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-full transition-colors disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleWithdraw} className="p-6 space-y-5">
          {status === 'success' ? (
            <div className="py-8 text-center flex flex-col items-center">
              <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mb-4">
                <Send size={32} />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">
                Withdrawal Initiated
              </h3>
              <p className="text-sm text-white/60">
                Your funds are on the way to the destination address.
              </p>
            </div>
          ) : (
            <>
              {/* Amount Input */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-white/70 uppercase tracking-wider">
                    Amount
                  </label>
                  <span className="text-xs text-white/50">
                    Balance: {balance.toLocaleString()} {currency}
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    step="any"
                    disabled={status === 'processing'}
                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-mono"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={setMaxAmount}
                      disabled={status === 'processing'}
                      className="px-2 py-1 text-[10px] font-bold uppercase tracking-widest bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
                    >
                      Max
                    </button>
                    <span className="text-sm font-bold text-white/50 pr-2">
                      {currency}
                    </span>
                  </div>
                </div>
              </div>

              {/* Destination Address Input */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-white/70 uppercase tracking-wider">
                  Destination Address (Stellar)
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="G..."
                  disabled={status === 'processing'}
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-mono text-sm"
                />
              </div>

              {/* Error Message */}
              {status === 'error' && (
                <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                  <AlertCircle size={16} className="mt-0.5 shrink-0" />
                  <p>{errorMessage}</p>
                </div>
              )}

              {/* Action Button */}
              <button
                type="submit"
                disabled={status === 'processing' || status === 'connecting'}
                className="w-full py-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {status === 'connecting' ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Connecting Wallet...
                  </>
                ) : status === 'processing' ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>Confirm Withdrawal</>
                )}
              </button>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
