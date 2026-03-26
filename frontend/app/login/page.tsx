'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Logo from '@/components/Logo';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, Lock, LogIn } from 'lucide-react';
import { useAuth } from '@/store/authStore';
import FormInput from '@/components/auth/FormInput';
import WalletConnectButton from '@/components/auth/WalletConnectButton';
import FormErrorAlert from '@/components/forms/FormErrorAlert';
import { classifyUnknownError, getErrorMessage, logError } from '@/lib/errors';

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
    setValue,
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

    if (user.role === 'landlord' || user.role === 'admin') {
      router.push('/landlords');
    } else if (user.role === 'agent') {
      router.push('/agents');
    } else {
      router.push('/');
    }
  }, [isAuthenticated, user, router, searchParams]);

  const onSubmit = async (data: LoginFormData) => {
    setServerError(null);
    try {
      const result = await login(data.email, data.password);
      if (!result.success) {
        const fallback = getErrorMessage('AUTH_REQUIRED');
        setServerError(result.error || fallback.message);
      }
    } catch (error) {
      const appError = classifyUnknownError(error, {
        source: 'app/login/page.tsx',
        action: 'submit-login',
        route: '/login',
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
          <h1 className="text-4xl font-bold text-white mb-2">Welcome back</h1>
          <p className="text-blue-200/80 text-base">
            Access your rental management platform
          </p>
        </div>

        {/* Premium Form Card */}
        <div className="backdrop-blur-xl bg-white/10 rounded-2xl border border-white/20 shadow-2xl p-8 space-y-6">
          {serverError && <FormErrorAlert message={serverError} />}

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-5"
            noValidate
          >
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
              <div className="flex items-center justify-between mb-2">
                <label
                  htmlFor="password"
                  className="block text-sm font-semibold text-white"
                >
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-blue-300 hover:text-blue-200 transition-colors"
                >
                  Forgot?
                </Link>
              </div>
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
              className="w-full py-3 px-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-indigo-700 active:from-blue-700 active:to-indigo-800 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed shadow-lg mt-6 hover:shadow-xl"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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

          {/* Demo Credentials */}
          <div className="mt-6 p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
            <p className="text-xs font-semibold text-amber-200 mb-3 text-center uppercase tracking-wide">
              Demo Accounts
            </p>
            <div className="space-y-2 text-xs">
              {[
                {
                  role: 'Admin',
                  email:
                    process.env.NODE_ENV === 'production'
                      ? 'admin@chioma.demo'
                      : 'admin@chioma.local',
                },
                {
                  role: 'Agent',
                  email:
                    process.env.NODE_ENV === 'production'
                      ? 'agent@chioma.demo'
                      : 'agent@chioma.local',
                },
                {
                  role: 'Landlord',
                  email:
                    process.env.NODE_ENV === 'production'
                      ? 'landlord@chioma.demo'
                      : 'landlord@chioma.local',
                },
                {
                  role: 'Tenant',
                  email:
                    process.env.NODE_ENV === 'production'
                      ? 'tenant@chioma.demo'
                      : 'tenant@chioma.local',
                },
              ].map(({ role, email }) => (
                <button
                  key={email}
                  type="button"
                  onClick={() => {
                    setValue('email', email);
                  }}
                  className="w-full text-left px-3 py-2 rounded bg-white/5 hover:bg-white/10 text-amber-100 hover:text-amber-50 transition-colors flex justify-between items-center group"
                >
                  <span className="font-medium">{role}</span>
                  <span className="font-mono text-amber-200/70 group-hover:text-amber-200 text-xs">
                    {email}
                  </span>
                </button>
              ))}
            </div>
            <p className="text-amber-200/60 text-xs mt-3 text-center">
              Click to auto-fill email • Password required
            </p>
          </div>

          <p className="text-center text-white/60 text-sm pt-2">
            Don&apos;t have an account?{' '}
            <Link
              href="/signup"
              className="text-blue-300 font-semibold hover:text-blue-200 transition-colors"
            >
              Create one
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
