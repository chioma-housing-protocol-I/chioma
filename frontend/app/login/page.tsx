'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, Lock, LogIn } from 'lucide-react';
import { useAuth } from '@/store/authStore';
import FormInput from '@/components/auth/FormInput';

const loginSchema = z.object({
  email: z.email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { login, isAuthenticated, user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const callbackUrl = searchParams.get('callbackUrl');
    if (callbackUrl) {
      router.push(decodeURIComponent(callbackUrl));
      return;
    }

    if (user.role === 'landlord') {
      router.push('/landlords');
    } else if (user.role === 'agent') {
      router.push('/agents');
    } else {
      router.push('/');
    }
  }, [isAuthenticated, user, router, searchParams]);

  const onSubmit = async (data: LoginFormData) => {
    setServerError(null);
    const result = await login(data.email, data.password);
    if (!result.success) {
      setServerError(result.error || 'Login failed. Please try again.');
    }
  };

  return (
    <main className="min-h-screen bg-brand-gradient flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md animate-auth-enter">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block mb-6">
            <span className="text-2xl font-bold text-white tracking-tight">
              Chioma
            </span>
          </Link>
          <h1 className="text-3xl font-bold text-white">Welcome back</h1>
          <p className="text-white/70 mt-2">
            Sign in to your account to continue
          </p>
        </div>

        {/* Glass Form Card */}
        <div className="glass rounded-4xl border border-white/20 shadow-2xl p-8">
          {serverError && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/20 border border-red-400/30">
              <p className="text-sm text-red-200">{serverError}</p>
            </div>
          )}

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-5"
            noValidate
          >
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-white/80 mb-1.5"
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
                className="block text-sm font-medium text-white/80 mb-1.5"
              >
                Password
              </label>
              <FormInput
                id="password"
                type="password"
                placeholder="Enter your password"
                icon={<Lock size={16} />}
                error={errors.password?.message}
                disabled={isSubmitting}
                registration={register('password')}
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 bg-white text-brand-blue font-semibold rounded-xl hover:bg-white/90 active:bg-white/80 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed shadow-lg mt-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-brand-blue/30 border-t-brand-blue rounded-full animate-spin" />
                  Signing in&hellip;
                </>
              ) : (
                <>
                  <LogIn size={18} />
                  Sign in
                </>
              )}
            </button>
          </form>

          <p className="text-center text-white/60 text-sm mt-6">
            Don&apos;t have an account?{' '}
            <Link
              href="/signup"
              className="text-white font-medium hover:underline"
            >
              Create one
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
