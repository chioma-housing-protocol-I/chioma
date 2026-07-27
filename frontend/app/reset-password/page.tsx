'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import Logo from '@/components/Logo';
import { apiClient } from '@/lib/api-client';
import toast from 'react-hot-toast';

const inputClasses =
  'w-full px-4 py-3 bg-ink-800 border border-cream/10 rounded-xl text-cream placeholder:text-cream-dim/40 focus:outline-none focus:border-brass-500/60 transition-colors text-sm';

const labelClasses =
  'block text-xs font-semibold text-cream-dim uppercase tracking-widest mb-2';

// Must match backend ResetPasswordDto validation:
// min 8 chars, uppercase + lowercase + (digit or special char)
const PASSWORD_REGEX = /((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/;

type Status = 'form' | 'submitting' | 'success' | 'error';

function ResetPasswordInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [status, setStatus] = useState<Status>(token ? 'form' : 'error');
  const [errorMessage, setErrorMessage] = useState(
    token
      ? ''
      : 'This reset link is missing its token. Please request a new one.',
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      setErrorMessage('Invalid reset link. Please request a new one.');
      setStatus('error');
      return;
    }

    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters.');
      return;
    }

    if (!PASSWORD_REGEX.test(newPassword)) {
      toast.error(
        'Password must include uppercase, lowercase, and a number or special character.',
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }

    setStatus('submitting');

    try {
      await apiClient.post<{ message: string }>(
        '/auth/reset-password',
        { token, newPassword },
        { retries: 0 },
      );
      setStatus('success');
      // Redirect to login after a short delay so the user can read the message.
      setTimeout(() => router.push('/login'), 3000);
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'This reset link is invalid or has expired. Please request a new one.',
      );
      setStatus('error');
    }
  };

  return (
    <div className="min-h-screen bg-ink-900 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md text-center">
        <div className="flex justify-center mb-8">
          <Link href="/">
            <Logo size="lg" textClassName="text-2xl font-bold text-cream" />
          </Link>
        </div>

        {/* Success state */}
        {status === 'success' && (
          <div className="bg-ink-800 border border-cream/10 rounded-3xl p-8">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-brand-green/10 border border-brand-green/30">
              <CheckCircle2 className="w-6 h-6 text-brand-green" />
            </div>
            <h1 className="font-display text-2xl text-cream mb-2">
              Password updated
            </h1>
            <p className="text-cream-dim text-sm mb-8">
              Your password has been changed. Redirecting you to sign in…
            </p>
            <Link
              href="/login"
              className="inline-flex w-full items-center justify-center px-6 py-3 rounded-xl bg-brass-500 hover:bg-brass-400 text-ink-950 font-semibold text-sm transition-colors"
            >
              Sign in now
            </Link>
          </div>
        )}

        {/* Error state (bad/missing token) */}
        {status === 'error' && (
          <div className="bg-ink-800 border border-cream/10 rounded-3xl p-8">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-rose-500/10 border border-rose-500/30">
              <XCircle className="w-6 h-6 text-rose-400" />
            </div>
            <h1 className="font-display text-2xl text-cream mb-2">
              Link expired
            </h1>
            <p className="text-cream-dim text-sm mb-8">{errorMessage}</p>
            <Link
              href="/forgot-password"
              className="inline-flex w-full items-center justify-center px-6 py-3 rounded-xl bg-brass-500 hover:bg-brass-400 text-ink-950 font-semibold text-sm transition-colors"
            >
              Request a new link
            </Link>
          </div>
        )}

        {/* Form state */}
        {(status === 'form' || status === 'submitting') && (
          <div className="bg-ink-800 border border-cream/10 rounded-3xl p-8 text-left">
            <div className="mb-6">
              <h1 className="font-display text-2xl text-cream">
                Choose a new password
              </h1>
              <p className="text-cream-dim text-sm mt-1">
                Must be at least 8 characters with uppercase, lowercase, and a
                number or symbol.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* New password */}
              <div>
                <label htmlFor="newPassword" className={labelClasses}>
                  New password
                </label>
                <div className="relative">
                  <input
                    id="newPassword"
                    type={showNew ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className={`${inputClasses} pr-12`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-cream-dim/60 hover:text-cream transition-colors"
                    aria-label={showNew ? 'Hide password' : 'Show password'}
                  >
                    {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Confirm password */}
              <div>
                <label htmlFor="confirmPassword" className={labelClasses}>
                  Confirm new password
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    type={showConfirm ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className={`${inputClasses} pr-12`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-cream-dim/60 hover:text-cream transition-colors"
                    aria-label={showConfirm ? 'Hide password' : 'Show password'}
                  >
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
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
                {status === 'submitting' ? 'Saving…' : 'Set new password'}
              </button>
            </form>

            <p className="text-center text-sm text-cream-dim mt-6">
              <Link
                href="/login"
                className="text-brass-400 hover:text-brass-300 font-semibold transition-colors"
              >
                Back to sign in
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-ink-900 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-brass-400 animate-spin" />
        </div>
      }
    >
      <ResetPasswordInner />
    </Suspense>
  );
}
