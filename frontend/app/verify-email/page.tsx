'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import Logo from '@/components/Logo';
import { apiClient } from '@/lib/api-client';

type Status = 'verifying' | 'success' | 'error';

function VerifyEmailInner() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<Status>('verifying');
  const [message, setMessage] = useState('');
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const token = searchParams.get('token');
    if (!token) {
      setStatus('error');
      setMessage('This verification link is missing its token.');
      return;
    }

    apiClient
      .get<{ message: string }>(
        `/auth/verify-email?token=${encodeURIComponent(token)}`,
        { retries: 0 },
      )
      .then((res) => {
        setStatus('success');
        setMessage(res.data.message);
      })
      .catch((err: unknown) => {
        setStatus('error');
        setMessage(
          err instanceof Error
            ? err.message
            : 'This verification link is invalid or has expired.',
        );
      });
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-ink-900 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md text-center">
        <div className="flex justify-center mb-8">
          <Link href="/">
            <Logo size="lg" textClassName="text-2xl font-bold text-cream" />
          </Link>
        </div>

        <div className="bg-ink-800 border border-cream/10 rounded-3xl p-8">
          {status === 'verifying' && (
            <>
              <Loader2 className="w-10 h-10 text-brass-400 animate-spin mx-auto mb-5" />
              <h1 className="font-display text-2xl text-cream">
                Verifying your email…
              </h1>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-brand-green/10 border border-brand-green/30">
                <CheckCircle2 className="w-6 h-6 text-brand-green" />
              </div>
              <h1 className="font-display text-2xl text-cream mb-2">
                Email verified
              </h1>
              <p className="text-cream-dim text-sm mb-8">{message}</p>
              <Link
                href="/login"
                className="inline-flex w-full items-center justify-center px-6 py-3 rounded-xl bg-brass-500 hover:bg-brass-400 text-ink-950 font-semibold text-sm transition-colors"
              >
                Continue to sign in
              </Link>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-rose-500/10 border border-rose-500/30">
                <XCircle className="w-6 h-6 text-rose-400" />
              </div>
              <h1 className="font-display text-2xl text-cream mb-2">
                Verification failed
              </h1>
              <p className="text-cream-dim text-sm mb-8">{message}</p>
              <Link
                href="/login"
                className="inline-flex w-full items-center justify-center px-6 py-3 rounded-xl border border-cream/15 text-cream hover:border-brass-500/50 hover:text-brass-300 font-semibold text-sm transition-colors"
              >
                Back to sign in
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-ink-900 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-brass-400 animate-spin" />
        </div>
      }
    >
      <VerifyEmailInner />
    </Suspense>
  );
}
