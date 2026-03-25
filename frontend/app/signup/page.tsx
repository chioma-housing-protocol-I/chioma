'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Logo from '@/components/Logo';
import { useRouter } from 'next/navigation';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, Lock, User, UserCheck } from 'lucide-react';
import { useAuth } from '@/store/authStore';
import FormInput from '@/components/auth/FormInput';
import WalletConnectButton from '@/components/auth/WalletConnectButton';
import FormErrorAlert from '@/components/forms/FormErrorAlert';
import { classifyUnknownError, logError } from '@/lib/errors';

const signupSchema = z.object({
  firstName: z
    .string()
    .min(2, 'First name must be at least 2 characters')
    .max(50, 'First name is too long'),
  lastName: z
    .string()
    .min(2, 'Last name must be at least 2 characters')
    .max(50, 'Last name is too long'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['TENANT', 'LANDLORD']),
});

type SignupFormData = z.infer<typeof signupSchema>;

export default function SignupPage() {
  const { setTokens, isAuthenticated, user, logout } = useAuth();
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: { role: 'TENANT' },
  });

  const selectedRole = useWatch({ control, name: 'role' });

  // Redirect authenticated users to their dashboard
  // Only redirect after successful signup, not on initial page load
  useEffect(() => {
    // Don't redirect on initial mount - let users access signup page
    // This prevents redirect loops when users intentionally visit /signup
    return;
  }, [isAuthenticated, user, router]);

  const onSubmit = async (data: SignupFormData) => {
    setServerError(null);
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Registration failed.');
      }

      const result = await response.json();
      setTokens(result.accessToken, result.refreshToken, result.user);

      // Redirect after successful signup
      if (result.user.role === 'landlord') {
        router.push('/landlords');
      } else if (result.user.role === 'agent') {
        router.push('/agents');
      } else {
        router.push('/');
      }
    } catch (error) {
      const appError = classifyUnknownError(error, {
        source: 'app/signup/page.tsx',
        action: 'submit-signup',
        route: '/signup',
      });
      logError(appError, appError.context);
      setServerError(appError.userMessage);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center px-4 py-8 sm:py-12 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div
          className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: '1s' }}
        ></div>
      </div>

      <div className="w-full max-w-md animate-auth-enter relative z-10">
        {/* Logo / Brand */}
        <div className="text-center mb-12">
          <Logo
            size="lg"
            href="/"
            className="inline-flex justify-center mb-8"
            textClassName="text-2xl font-bold bg-gradient-to-r from-blue-300 to-indigo-300 bg-clip-text text-transparent tracking-tight"
          />
          <h1 className="text-4xl font-bold text-white mb-2">
            Create your account
          </h1>
          <p className="text-blue-200/80 text-base">
            Join thousands managing properties smarter
          </p>
        </div>

        {/* Premium Form Card */}
        <div className="backdrop-blur-xl bg-white/10 rounded-2xl border border-white/20 shadow-2xl p-8 space-y-6">
          {/* Already logged in notice */}
          {isAuthenticated && user && (
            <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
              <p className="text-sm text-blue-200 mb-3">
                You&apos;re already logged in as{' '}
                <span className="font-semibold">{user.email}</span>
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    if (user.role === 'landlord') {
                      router.push('/landlords');
                    } else if (user.role === 'agent') {
                      router.push('/agents');
                    } else {
                      router.push('/');
                    }
                  }}
                  className="flex-1 py-2 px-3 bg-blue-500/20 hover:bg-blue-500/30 text-blue-100 text-sm font-medium rounded transition-colors"
                >
                  Go to Dashboard
                </button>
                <button
                  onClick={() => logout()}
                  className="flex-1 py-2 px-3 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-sm font-medium rounded transition-colors"
                >
                  Logout
                </button>
              </div>
            </div>
          )}

          {serverError && <FormErrorAlert message={serverError} />}

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-5"
            noValidate
          >
            {/* Role Toggle */}
            <div>
              <div className="grid grid-cols-2 gap-2 p-1 rounded-lg bg-white/5 border border-white/20">
                {(['TENANT', 'LANDLORD'] as const).map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() =>
                      setValue('role', role, { shouldValidate: true })
                    }
                    className={`py-2.5 px-4 rounded-md text-sm font-semibold transition-all duration-200 ${
                      selectedRole === role
                        ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg'
                        : 'text-white/70 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {role.charAt(0) + role.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Name Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="firstName"
                  className="block text-sm font-semibold text-white mb-2"
                >
                  First name
                </label>
                <FormInput
                  id="firstName"
                  placeholder="John"
                  icon={<User size={16} />}
                  error={errors.firstName?.message}
                  disabled={isSubmitting}
                  registration={register('firstName')}
                />
              </div>
              <div>
                <label
                  htmlFor="lastName"
                  className="block text-sm font-semibold text-white mb-2"
                >
                  Last name
                </label>
                <FormInput
                  id="lastName"
                  placeholder="Doe"
                  icon={<User size={16} />}
                  error={errors.lastName?.message}
                  disabled={isSubmitting}
                  registration={register('lastName')}
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-semibold text-white mb-2"
              >
                Email address
              </label>
              <FormInput
                id="email"
                type="email"
                placeholder="you@example.com"
                icon={<Mail size={16} />}
                error={errors.email?.message}
                disabled={isSubmitting}
                registration={register('email')}
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-semibold text-white mb-2"
              >
                Password
              </label>
              <FormInput
                id="password"
                type="password"
                placeholder="At least 8 characters"
                icon={<Lock size={16} />}
                error={errors.password?.message}
                disabled={isSubmitting}
                registration={register('password')}
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-indigo-700 active:from-blue-700 active:to-indigo-800 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed shadow-lg mt-6 hover:shadow-xl"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating account&hellip;
                </>
              ) : (
                <>
                  <UserCheck size={18} />
                  Create account
                </>
              )}
            </button>
          </form>

          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/20"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-3 bg-white/5 text-white/50 font-medium">
                OR
              </span>
            </div>
          </div>

          <WalletConnectButton className="w-full" />

          <p className="text-center text-white/60 text-sm pt-2">
            Already have an account?{' '}
            <Link
              href="/login"
              className="text-blue-300 font-semibold hover:text-blue-200 transition-colors"
            >
              Sign in
            </Link>
          </p>
        </div>

        {/* Footer */}
        <p className="text-center text-white/40 text-xs mt-8">
          Secure rental management platform
        </p>
      </div>
    </main>
  );
}
