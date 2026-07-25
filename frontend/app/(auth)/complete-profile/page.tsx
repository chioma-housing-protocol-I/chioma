'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Mail, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/store/authStore';

const inputClasses =
  'w-full px-4 py-3 bg-ink-800 border border-cream/10 rounded-xl text-cream placeholder:text-cream-dim/40 focus:outline-none focus:border-brass-500/60 transition-colors text-sm';

const labelClasses =
  'block text-xs font-semibold text-cream-dim uppercase tracking-widest mb-2';

export default function CompleteProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated, loading, completeProfile } = useAuth();

  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }
    // Already has a verified email — nothing to complete here.
    if (user?.email && user.emailVerified) {
      router.replace(user.role === 'admin' ? '/admin' : '/user');
    }
  }, [loading, isAuthenticated, user, router]);

  useEffect(() => {
    if (user?.firstName) setFirstName(user.firstName);
    if (user?.lastName) setLastName(user.lastName);
    if (user?.email) setEmail(user.email);
  }, [user?.firstName, user?.lastName, user?.email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error('Please enter an email address.');
      return;
    }
    setIsSubmitting(true);
    const result = await completeProfile({ email, firstName, lastName });
    setIsSubmitting(false);
    if (result.success) {
      setSubmitted(true);
    } else {
      toast.error(result.error ?? 'Could not save your profile.');
    }
  };

  const goToDashboard = () => {
    router.push(user?.role === 'admin' ? '/admin' : '/user');
  };

  if (submitted) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-brand-green/10 border border-brand-green/30">
          <Mail className="w-6 h-6 text-brand-green" />
        </div>
        <h1 className="font-display text-3xl text-cream mb-3">
          Check your inbox
        </h1>
        <p className="text-cream-dim text-sm mb-8 max-w-sm mx-auto leading-relaxed">
          We sent a verification link to{' '}
          <strong className="text-cream">{email}</strong>. Click it whenever you
          get a moment — you can keep using Chioma in the meantime.
        </p>
        <button
          type="button"
          onClick={goToDashboard}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-brass-500 hover:bg-brass-400 text-ink-950 font-semibold rounded-xl transition-colors text-sm"
        >
          <CheckCircle2 size={16} />
          Continue to dashboard
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-3xl text-cream">One last thing</h1>
        <p className="text-cream-dim text-sm mt-2 leading-relaxed">
          Your wallet is connected. Add an email so we can send receipts, lease
          updates, and let you recover your account.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="firstName" className={labelClasses}>
              First name
            </label>
            <input
              id="firstName"
              type="text"
              autoComplete="given-name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Ada"
              className={inputClasses}
            />
          </div>
          <div>
            <label htmlFor="lastName" className={labelClasses}>
              Last name
            </label>
            <input
              id="lastName"
              type="text"
              autoComplete="family-name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Okafor"
              className={inputClasses}
            />
          </div>
        </div>

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

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-brass-500 hover:bg-brass-400 disabled:opacity-60 disabled:cursor-not-allowed text-ink-950 font-semibold rounded-xl transition-colors text-sm"
        >
          {isSubmitting && <Loader2 size={16} className="animate-spin" />}
          {isSubmitting ? 'Saving…' : 'Save and send verification'}
        </button>
      </form>

      <button
        type="button"
        onClick={goToDashboard}
        className="w-full text-center text-sm text-cream-dim hover:text-cream mt-6 transition-colors"
      >
        Skip for now
      </button>
    </div>
  );
}
