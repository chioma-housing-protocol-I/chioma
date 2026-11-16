'use client';

import * as React from 'react';
import Link from 'next/link';
import { Loader2, Mail, CheckCircle2, ArrowLeft } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  FormValidationFeedback,
  ValidatedInputWrapper,
  type FieldError,
} from '@/components/forms';
import { apiClient } from '@/lib/api-client';

type Status = 'idle' | 'submitting' | 'sent' | 'error';

export interface ForgotPasswordFormProps {
  /**
   * Callback when email is successfully sent
   */
  onSuccess?: (email: string) => void;

  /**
   * Show back to login link
   */
  showBackLink?: boolean;

  /**
   * Custom className
   */
  className?: string;
}

export function ForgotPasswordForm({
  onSuccess,
  showBackLink = true,
  className,
}: ForgotPasswordFormProps) {
  const [email, setEmail] = React.useState('');
  const [status, setStatus] = React.useState<Status>('idle');
  const [errors, setErrors] = React.useState<FieldError[]>([]);
  const [emailError, setEmailError] = React.useState('');

  const validateEmail = (value: string): boolean => {
    setEmailError('');
    
    if (!value) {
      setEmailError('Email address is required');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      setEmailError('Please enter a valid email address');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors([]);

    if (!validateEmail(email)) {
      return;
    }

    setStatus('submitting');

    try {
      await apiClient.post<{ message: string }>(
        '/auth/forgot-password',
        { email: email.toLowerCase() },
        { retries: 1 },
      );
      
      setStatus('sent');
      onSuccess?.(email);
    } catch (err: unknown) {
      // For security, always show success message to prevent user enumeration
      // Even if there's an error, we don't reveal whether the email exists
      setStatus('sent');
      onSuccess?.(email);
    }
  };

  // Success state
  if (status === 'sent') {
    return (
      <div className={className}>
        <div className="flex justify-center mb-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800">
            <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
        </div>

        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold mb-3">Check your inbox</h1>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              We&apos;ve sent password reset instructions to{' '}
              <span className="font-semibold text-foreground">{email}</span>
            </p>
            <p>
              If you don&apos;t see the email within a few minutes, check your spam folder.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <Button
            onClick={() => {
              setStatus('idle');
              setEmail('');
            }}
            variant="outline"
            className="w-full"
          >
            Try a different email
          </Button>

          {showBackLink && (
            <Link href="/login" className="block">
              <Button variant="ghost" className="w-full">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to sign in
              </Button>
            </Link>
          )}
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs text-muted-foreground">
            Didn&apos;t receive the email?{' '}
            <button
              onClick={() => setStatus('idle')}
              className="font-semibold text-primary hover:underline"
            >
              Resend
            </button>
          </p>
        </div>
      </div>
    );
  }

  // Form state
  return (
    <div className={className}>
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">Reset your password</h1>
        <p className="text-sm text-muted-foreground">
          Enter your account email and we&apos;ll send you a password reset link.
        </p>
      </div>

      <FormValidationFeedback errors={errors} />

      <form onSubmit={handleSubmit} className="space-y-6">
        <ValidatedInputWrapper
          label="Email Address"
          id="email"
          required
          error={emailError}
          hint="We'll send reset instructions to this address"
        >
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setEmailError('');
              }}
              onBlur={() => email && validateEmail(email)}
              className={`pl-10 ${emailError ? 'border-destructive' : ''}`}
              disabled={status === 'submitting'}
              required
            />
          </div>
        </ValidatedInputWrapper>

        <Button
          type="submit"
          disabled={status === 'submitting' || !!emailError}
          className="w-full"
        >
          {status === 'submitting' && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          {status === 'submitting' ? 'Sending...' : 'Send reset link'}
        </Button>
      </form>

      {showBackLink && (
        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground">
            Remembered your password?{' '}
            <Link
              href="/login"
              className="font-semibold text-primary hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>
      )}

      <div className="mt-6 p-4 rounded-lg bg-muted/50">
        <p className="text-xs text-muted-foreground leading-relaxed">
          <strong>Security note:</strong> For your security, we won&apos;t reveal whether
          this email address is registered. If the email exists in our system, you&apos;ll
          receive reset instructions.
        </p>
      </div>
    </div>
  );
}

export default ForgotPasswordForm;
