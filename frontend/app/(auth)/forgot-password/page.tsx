'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Loader2, Mail, CheckCircle2 } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import toast from 'react-hot-toast';

const inputClasses =
  'w-full px-4 py-3 bg-ink-800 border border-cream/10 rounded-xl text-cream placeholder:text-cream-dim/40 focus:outline-none focus:border-brass-500/60 transition-colors text-sm';

const labelClasses =
  'block text-xs font-semibold text-cream-dim uppercase tracking-widest mb-2';

type Status = 'idle' | 'submitting' | 'sent';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error('Please enter your email address.');
      return;
    }
    setStatus('submitting');
    try {
      await apiClient.post<{ message: string }>(
        '/auth/forgot-password',
        { email },
        { retries: 0 },
      );
      setStatus('sent');
    } catch {
      // Always show the same message to avoid user enumeration.
      setStatus('sent');
    }
  };

  if (status === 'sent') {
    return (
      <div>
        <div className="flex justify-center mb-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brass-500/10 border border-brass-500/30">
            <CheckCircle2 className="w-6 h-6 text-brass-400" />
          </div>
        </div>
        <div className="mb-8 text-center">
          <h1 className="font-display text-3xl text-cream mb-2">
            Check your inbox
          </h1>
          <p className="text-cream-dim text-sm leading-relaxed">
            If <span className="text-cream font-medium">{email}</span> is
            registered, we&apos;ve sent a password reset link. Check your spam
            folder if it doesn&apos;t arrive within a few minutes.
          </p>
        </div>
        <Link
          href="/login"
          className="inline-flex w-full items-center justify-center px-6 py-3 rounded-xl border border-cream/15 text-cream hover:border-brass-500/50 hover:text-brass-300 font-semibold text-sm transition-colors"
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-3xl text-cream">
          Reset your password
        </h1>
        <p className="text-cream-dim text-sm mt-2">
          Enter your account email and we&apos;ll send you a reset link.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="email" className={labelClasses}>
            Email address
          </label>
          <div className="relative">
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              className={`${inputClasses} pl-10`}
            />
            <Mail
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-cream-dim/40 pointer-events-none"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={status === 'submitting'}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-brass-500 hover:bg-brass-400 disabled:opacity-60 disabled:cursor-not-allowed text-ink-950 font-semibold rounded-xl transition-colors text-sm"
        >
          {status === 'submitting' && (
            <Loader2 size={16} className="animate-spin" />
          )}
          {status === 'submitting' ? 'Sending…' : 'Send reset link'}
        </button>
      </form>

      <p className="text-center text-sm text-cream-dim mt-8">
        Remembered it?{' '}
        <Link
          href="/login"
          className="text-brass-400 hover:text-brass-300 font-semibold transition-colors"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
