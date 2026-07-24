'use client';

import { Suspense, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '@/store/authStore';
import toast from 'react-hot-toast';
import dynamic from 'next/dynamic';
import OAuthButtons from '@/components/auth/OAuthButtons';

const WalletConnectButton = dynamic(
  () => import('@/components/auth/WalletConnectButton'),
  {
    ssr: false,
    loading: () => <div className="h-11 rounded-xl bg-ink-800" />,
  },
);

const inputClasses =
  'w-full px-4 py-3 bg-ink-800 border border-cream/10 rounded-xl text-cream placeholder:text-cream-dim/40 focus:outline-none focus:border-brass-500/60 transition-colors text-sm';

const labelClasses =
  'block text-xs font-semibold text-cream-dim uppercase tracking-widest mb-2';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, isAuthenticated, user, loading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Only follow same-origin relative paths from ?next= to avoid open redirects.
  const nextParam = searchParams.get('next');
  const nextPath =
    nextParam && nextParam.startsWith('/') && !nextParam.startsWith('//')
      ? nextParam
      : null;

  useEffect(() => {
    if (!loading && isAuthenticated && user) {
      router.replace(nextPath ?? (user.role === 'admin' ? '/admin' : '/user'));
    }
  }, [isAuthenticated, user, loading, router, nextPath]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please enter your email and password.');
      return;
    }
    setIsSubmitting(true);
    const result = await login(email, password);
    setIsSubmitting(false);
    if (result.success) {
      toast.success('Welcome back!');
      const role = useAuth.getState().user?.role;
      router.push(nextPath ?? (role === 'admin' ? '/admin' : '/user'));
    } else {
      toast.error(result.error ?? 'Login failed. Please try again.');
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-3xl text-cream">Welcome back</h1>
        <p className="text-cream-dim text-sm mt-2">
          Sign in to your Chioma account
        </p>
      </div>

      <OAuthButtons />

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-cream/10" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-ink-900 px-3 text-cream-dim/70 font-medium">
            or with email
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="email" className={labelClasses}>
            Email address
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="you@example.com"
            className={inputClasses}
          />
        </div>

        <div>
          <label htmlFor="password" className={labelClasses}>
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className={`${inputClasses} pr-12`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-cream-dim/60 hover:text-cream transition-colors"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <div className="flex justify-end mt-2">
            <Link
              href="#"
              className="text-xs text-brass-400 hover:text-brass-300 transition-colors"
            >
              Forgot password?
            </Link>
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-brass-500 hover:bg-brass-400 disabled:opacity-60 disabled:cursor-not-allowed text-ink-950 font-semibold rounded-xl transition-colors text-sm"
        >
          {isSubmitting && <Loader2 size={16} className="animate-spin" />}
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-cream/10" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-ink-900 px-3 text-cream-dim/70 font-medium">
            or connect a wallet
          </span>
        </div>
      </div>

      <WalletConnectButton
        className="w-full"
        buttonText="Connect Stellar Wallet"
      />

      <p className="text-center text-sm text-cream-dim mt-8">
        Don&apos;t have an account?{' '}
        <Link
          href="/signup"
          className="text-brass-400 hover:text-brass-300 font-semibold transition-colors"
        >
          Sign up
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 text-brass-400 animate-spin" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
