'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/store/authStore';
import { completeOAuth } from '@/lib/oauth';

function OAuthCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setTokens } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const providerError = searchParams.get('error_description');

    if (providerError || !code || !state) {
      setError(providerError ?? 'The sign-in attempt was cancelled.');
      return;
    }

    completeOAuth(code, state)
      .then((result) => {
        setTokens(result.accessToken, result.refreshToken, {
          id: result.user.id,
          email: result.user.email,
          // OAuth providers only return verified addresses.
          emailVerified: true,
          firstName: result.user.firstName ?? '',
          lastName: result.user.lastName ?? '',
          role: result.user.role === 'admin' ? 'admin' : 'user',
        });
        toast.success('Welcome to Chioma!');
        router.replace(result.user.role === 'admin' ? '/admin' : '/user');
      })
      .catch((err: unknown) => {
        setError(
          err instanceof Error
            ? err.message
            : 'Sign-in could not be completed.',
        );
      });
  }, [router, searchParams, setTokens]);

  if (error) {
    return (
      <div className="text-center">
        <h1 className="font-display text-3xl text-cream mb-3">
          Sign-in didn&apos;t finish
        </h1>
        <p className="text-cream-dim text-sm mb-8">{error}</p>
        <Link
          href="/login"
          className="inline-flex px-6 py-3 rounded-xl bg-brass-500 hover:bg-brass-400 text-ink-950 font-semibold text-sm transition-colors"
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center text-center gap-4">
      <Loader2 className="w-8 h-8 text-brass-400 animate-spin" />
      <p className="text-cream-dim text-sm">Finishing sign-in…</p>
    </div>
  );
}

export default function OAuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center">
          <Loader2 className="w-8 h-8 text-brass-400 animate-spin" />
        </div>
      }
    >
      <OAuthCallbackInner />
    </Suspense>
  );
}
