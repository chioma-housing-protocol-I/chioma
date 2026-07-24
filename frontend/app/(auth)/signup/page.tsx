'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '@/store/authStore';
import toast from 'react-hot-toast';
import OAuthButtons from '@/components/auth/OAuthButtons';

const inputClasses =
  'w-full px-4 py-3 bg-ink-800 border border-cream/10 rounded-xl text-cream placeholder:text-cream-dim/40 focus:outline-none focus:border-brass-500/60 transition-colors text-sm';

const labelClasses =
  'block text-xs font-semibold text-cream-dim uppercase tracking-widest mb-2';

const roles = [
  {
    value: 'user' as const,
    title: 'Rent or list a home',
    description: 'Tenant or landlord',
  },
  {
    value: 'agent' as const,
    title: 'Work as an agent',
    description: 'Earn automated commissions',
  },
];

export default function SignupPage() {
  const router = useRouter();
  const { register, isAuthenticated, user, loading } = useAuth();

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'user' as 'user' | 'agent',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && isAuthenticated && user) {
      router.replace(user.role === 'admin' ? '/admin' : '/user');
    }
  }, [isAuthenticated, user, loading, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }
    if (form.password.length < 8) {
      toast.error('Password must be at least 8 characters.');
      return;
    }
    setIsSubmitting(true);
    const result = await register({
      firstName: form.firstName,
      lastName: form.lastName,
      email: form.email,
      password: form.password,
      role: form.role,
    });
    setIsSubmitting(false);
    if (result.success) {
      toast.success('Account created! Welcome to Chioma.');
      router.push('/user');
    } else {
      toast.error(result.error ?? 'Registration failed. Please try again.');
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-3xl text-cream">
          Create your account
        </h1>
        <p className="text-cream-dim text-sm mt-2">
          Free to start — no credit card required
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
        {/* Role selection */}
        <fieldset>
          <legend className={labelClasses}>I want to…</legend>
          <div className="grid grid-cols-2 gap-3">
            {roles.map((role) => (
              <label
                key={role.value}
                className={`cursor-pointer rounded-xl border px-4 py-3 transition-colors ${
                  form.role === role.value
                    ? 'border-brass-500/70 bg-brass-500/10'
                    : 'border-cream/10 bg-ink-800 hover:border-cream/25'
                }`}
              >
                <input
                  type="radio"
                  name="role"
                  value={role.value}
                  checked={form.role === role.value}
                  onChange={handleChange}
                  className="sr-only"
                />
                <span className="block text-sm font-semibold text-cream">
                  {role.title}
                </span>
                <span className="block text-xs text-cream-dim mt-0.5">
                  {role.description}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="firstName" className={labelClasses}>
              First name
            </label>
            <input
              id="firstName"
              name="firstName"
              type="text"
              autoComplete="given-name"
              value={form.firstName}
              onChange={handleChange}
              required
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
              name="lastName"
              type="text"
              autoComplete="family-name"
              value={form.lastName}
              onChange={handleChange}
              required
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
            name="email"
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={handleChange}
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
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              value={form.password}
              onChange={handleChange}
              required
              placeholder="Min. 8 characters"
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
        </div>

        <div>
          <label htmlFor="confirmPassword" className={labelClasses}>
            Confirm password
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            value={form.confirmPassword}
            onChange={handleChange}
            required
            placeholder="Re-enter password"
            className={inputClasses}
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-brass-500 hover:bg-brass-400 disabled:opacity-60 disabled:cursor-not-allowed text-ink-950 font-semibold rounded-xl transition-colors text-sm mt-2"
        >
          {isSubmitting && <Loader2 size={16} className="animate-spin" />}
          {isSubmitting ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <p className="text-center text-sm text-cream-dim mt-8">
        Already have an account?{' '}
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
