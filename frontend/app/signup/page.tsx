'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, Lock, User, UserCheck } from 'lucide-react';
import { useAuth } from '@/store/authStore';
import FormInput from '@/components/auth/FormInput';

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
  const { setTokens, isAuthenticated, user } = useAuth();
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: { role: 'TENANT' },
  });

  const selectedRole = watch('role');

  useEffect(() => {
    if (!isAuthenticated || !user) return;

    if (user.role === 'landlord') {
      router.push('/landlords');
    } else if (user.role === 'agent') {
      router.push('/agents');
    } else {
      router.push('/');
    }
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
        setServerError(
          errorData.message || 'Registration failed. Please try again.',
        );
        return;
      }

      const result = await response.json();
      setTokens(result.accessToken, result.refreshToken, result.user);
    } catch {
      setServerError('Network error. Please check your connection.');
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
          <h1 className="text-3xl font-bold text-white">Create your account</h1>
          <p className="text-white/70 mt-2">
            Join thousands managing properties smarter
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
            {/* Role Toggle */}
            <div>
              <label className="block text-sm font-medium text-white/80 mb-1.5">
                I am a
              </label>
              <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-white/10 border border-white/20">
                {(['TENANT', 'LANDLORD'] as const).map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() =>
                      setValue('role', role, { shouldValidate: true })
                    }
                    className={`py-2.5 px-4 rounded-lg text-sm font-semibold transition-all duration-200 ${
                      selectedRole === role
                        ? 'bg-white text-brand-blue shadow-sm'
                        : 'text-white/70 hover:text-white'
                    }`}
                  >
                    {role.charAt(0) + role.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Name Fields */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="firstName"
                  className="block text-sm font-medium text-white/80 mb-1.5"
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
                  className="block text-sm font-medium text-white/80 mb-1.5"
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
              className="w-full py-3 px-4 bg-white text-brand-blue font-semibold rounded-xl hover:bg-white/90 active:bg-white/80 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed shadow-lg mt-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-brand-blue/30 border-t-brand-blue rounded-full animate-spin" />
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

          <p className="text-center text-white/60 text-sm mt-6">
            Already have an account?{' '}
            <Link
              href="/login"
              className="text-white font-medium hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
