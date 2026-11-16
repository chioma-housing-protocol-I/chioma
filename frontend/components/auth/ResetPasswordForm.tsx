'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, Eye, EyeOff, CheckCircle2, XCircle, Lock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  FormValidationFeedback,
  ValidatedInputWrapper,
  type FieldError,
} from '@/components/forms';
import {
  PasswordStrengthMeter,
  calculatePasswordStrength,
} from './PasswordStrengthMeter';
import { apiClient } from '@/lib/api-client';

type Status = 'idle' | 'submitting' | 'success' | 'error';

export interface ResetPasswordFormProps {
  /**
   * Reset token from email link
   */
  token: string | null;

  /**
   * Callback when password is successfully reset
   */
  onSuccess?: () => void;

  /**
   * Callback when reset fails
   */
  onError?: (error: string) => void;

  /**
   * Custom className
   */
  className?: string;

  /**
   * Redirect to login after success (default: true)
   */
  redirectAfterSuccess?: boolean;

  /**
   * Redirect delay in ms (default: 3000)
   */
  redirectDelay?: number;
}

export function ResetPasswordForm({
  token,
  onSuccess,
  onError,
  className,
  redirectAfterSuccess = true,
  redirectDelay = 3000,
}: ResetPasswordFormProps) {
  const router = useRouter();
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [showNewPassword, setShowNewPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const [status, setStatus] = React.useState<Status>(token ? 'idle' : 'error');
  const [errors, setErrors] = React.useState<FieldError[]>([]);
  const [errorMessage, setErrorMessage] = React.useState(
    token ? '' : 'This reset link is missing its token. Please request a new one.',
  );

  const passwordStrength = React.useMemo(
    () => calculatePasswordStrength(newPassword),
    [newPassword],
  );

  const validatePasswords = (): boolean => {
    const validationErrors: FieldError[] = [];

    if (!newPassword) {
      validationErrors.push({
        field: 'New Password',
        message: 'Password is required',
      });
    } else if (newPassword.length < 8) {
      validationErrors.push({
        field: 'New Password',
        message: 'Password must be at least 8 characters',
      });
    } else if (!passwordStrength.isValid) {
      validationErrors.push({
        field: 'New Password',
        message: 'Password does not meet security requirements',
      });
    }

    if (!confirmPassword) {
      validationErrors.push({
        field: 'Confirm Password',
        message: 'Please confirm your password',
      });
    } else if (newPassword !== confirmPassword) {
      validationErrors.push({
        field: 'Confirm Password',
        message: 'Passwords do not match',
      });
    }

    setErrors(validationErrors);
    return validationErrors.length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors([]);
    setErrorMessage('');

    if (!token) {
      setErrorMessage('Invalid reset link. Please request a new one.');
      setStatus('error');
      onError?.('Invalid reset link');
      return;
    }

    if (!validatePasswords()) {
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
      onSuccess?.();

      if (redirectAfterSuccess) {
        setTimeout(() => {
          router.push('/login');
        }, redirectDelay);
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'This reset link is invalid or has expired. Please request a new one.';

      setErrorMessage(message);
      setStatus('error');
      onError?.(message);
    }
  };

  // Success state
  if (status === 'success') {
    return (
      <div className={className}>
        <div className="flex justify-center mb-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800">
            <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
        </div>

        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold mb-3">Password updated!</h1>
          <p className="text-sm text-muted-foreground">
            Your password has been successfully changed.
            {redirectAfterSuccess && ' Redirecting you to sign in...'}
          </p>
        </div>

        <Link href="/login" className="block">
          <Button className="w-full">Continue to sign in</Button>
        </Link>
      </div>
    );
  }

  // Error state (invalid/expired token)
  if (status === 'error' && !token) {
    return (
      <div className={className}>
        <div className="flex justify-center mb-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800">
            <XCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
        </div>

        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold mb-3">Link expired</h1>
          <p className="text-sm text-muted-foreground">{errorMessage}</p>
        </div>

        <Link href="/forgot-password" className="block">
          <Button className="w-full">Request a new link</Button>
        </Link>
      </div>
    );
  }

  // Form state
  return (
    <div className={className}>
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">Choose a new password</h1>
        <p className="text-sm text-muted-foreground">
          Create a strong password to secure your account.
        </p>
      </div>

      <FormValidationFeedback
        errors={errors}
        error={errorMessage && status === 'error' ? errorMessage : undefined}
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* New password */}
        <ValidatedInputWrapper
          label="New Password"
          id="newPassword"
          required
        >
          <div className="space-y-3">
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                id="newPassword"
                type={showNewPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="pl-10 pr-10"
                disabled={status === 'submitting'}
                required
              />
              <button
                type="button"
                onClick={() => setShowNewPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                tabIndex={-1}
              >
                {showNewPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>

            {/* Password strength meter */}
            {newPassword && (
              <PasswordStrengthMeter
                password={newPassword}
                showRequirements
                showSuggestions={passwordStrength.strength.score < 3}
              />
            )}
          </div>
        </ValidatedInputWrapper>

        {/* Confirm password */}
        <ValidatedInputWrapper
          label="Confirm New Password"
          id="confirmPassword"
          required
          error={
            confirmPassword && newPassword !== confirmPassword
              ? 'Passwords do not match'
              : undefined
          }
          success={
            confirmPassword && newPassword === confirmPassword && passwordStrength.isValid
              ? 'Passwords match'
              : undefined
          }
        >
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="pl-10 pr-10"
              disabled={status === 'submitting'}
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
              tabIndex={-1}
            >
              {showConfirmPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </ValidatedInputWrapper>

        <Button
          type="submit"
          disabled={
            status === 'submitting' ||
            !passwordStrength.isValid ||
            newPassword !== confirmPassword
          }
          className="w-full"
        >
          {status === 'submitting' && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          {status === 'submitting' ? 'Saving...' : 'Set new password'}
        </Button>
      </form>

      <div className="mt-8 text-center">
        <Link
          href="/login"
          className="text-sm font-semibold text-primary hover:underline"
        >
          Back to sign in
        </Link>
      </div>

      {/* Security tips */}
      <div className="mt-6 p-4 rounded-lg bg-muted/50">
        <p className="text-xs font-semibold mb-2">Password tips:</p>
        <ul className="text-xs text-muted-foreground space-y-1">
          <li>• Use a mix of letters, numbers, and symbols</li>
          <li>• Avoid common words and personal information</li>
          <li>• Use a unique password for each account</li>
          <li>• Consider using a password manager</li>
        </ul>
      </div>
    </div>
  );
}

export default ResetPasswordForm;
