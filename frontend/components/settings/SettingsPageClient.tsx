'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import Image from 'next/image';
import { useAuth } from '@/store/authStore';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { SettingsCard } from './SettingsCard';
import { PreferenceSwitch } from './PreferenceSwitch';
import { ThemeSelector } from './ThemeSelector';
import { MfaSetupPayload, ThemePreference, UserPreferences } from './types';

interface SettingsPageClientProps {
  embedded?: boolean;
  requireAuthGuard?: boolean;
}

const SETTINGS_STORAGE_KEY = 'chioma_user_preferences';

const DEFAULT_PREFERENCES: UserPreferences = {
  notifications: {
    email: {
      newPropertyMatches: true,
      paymentReminders: true,
      maintenanceUpdates: true,
    },
    push: {
      newMessages: true,
      criticalAlerts: true,
    },
    inAppSummary: true,
  },
  appearanceTheme: 'system',
  language: 'en',
  currency: 'NGN',
};

const passwordSchema = z
  .object({
    currentPassword: z
      .string()
      .min(8, 'Current password must be at least 8 characters'),
    newPassword: z
      .string()
      .min(12, 'New password must be at least 12 characters')
      .regex(/[A-Z]/, 'Must include at least one uppercase letter')
      .regex(/[a-z]/, 'Must include at least one lowercase letter')
      .regex(/\d/, 'Must include at least one number')
      .regex(/[^A-Za-z0-9]/, 'Must include at least one special character'),
    confirmPassword: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: 'New password must be different from your current password',
    path: ['newPassword'],
  });

type PasswordFormValues = z.infer<typeof passwordSchema>;

const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'fr', label: 'French' },
];

const CURRENCY_OPTIONS = [
  { value: 'NGN', label: 'Nigerian Naira (NGN)' },
  { value: 'USD', label: 'US Dollar (USD)' },
  { value: 'USDC', label: 'USD Coin (USDC)' },
];

function applyTheme(theme: ThemePreference) {
  if (typeof window === 'undefined') return;

  const resolvedTheme =
    theme === 'system'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      : theme;

  document.documentElement.classList.toggle('dark', resolvedTheme === 'dark');
  document.documentElement.style.colorScheme = resolvedTheme;
  document.documentElement.setAttribute('data-theme', theme);
}

function getPasswordStrength(password: string) {
  let score = 0;
  if (password.length >= 12) score += 1;
  if (password.length >= 16) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[a-z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  const normalized = Math.min(100, Math.round((score / 6) * 100));
  if (normalized < 45) return { score: normalized, label: 'Weak' };
  if (normalized < 75) return { score: normalized, label: 'Good' };
  return { score: normalized, label: 'Strong' };
}

function normalizePreferences(payload: unknown): UserPreferences | null {
  if (!payload || typeof payload !== 'object') return null;

  const raw = payload as Partial<UserPreferences>;
  const boolWithDefault = (value: unknown, fallback: boolean) =>
    typeof value === 'boolean' ? value : fallback;

  return {
    notifications: {
      email: {
        newPropertyMatches: boolWithDefault(
          raw.notifications?.email.newPropertyMatches,
          DEFAULT_PREFERENCES.notifications.email.newPropertyMatches,
        ),
        paymentReminders: boolWithDefault(
          raw.notifications?.email.paymentReminders,
          DEFAULT_PREFERENCES.notifications.email.paymentReminders,
        ),
        maintenanceUpdates: boolWithDefault(
          raw.notifications?.email.maintenanceUpdates,
          DEFAULT_PREFERENCES.notifications.email.maintenanceUpdates,
        ),
      },
      push: {
        newMessages: boolWithDefault(
          raw.notifications?.push.newMessages,
          DEFAULT_PREFERENCES.notifications.push.newMessages,
        ),
        criticalAlerts: boolWithDefault(
          raw.notifications?.push.criticalAlerts,
          DEFAULT_PREFERENCES.notifications.push.criticalAlerts,
        ),
      },
      inAppSummary: boolWithDefault(
        raw.notifications?.inAppSummary,
        DEFAULT_PREFERENCES.notifications.inAppSummary,
      ),
    },
    appearanceTheme:
      raw.appearanceTheme === 'light' ||
      raw.appearanceTheme === 'dark' ||
      raw.appearanceTheme === 'system'
        ? raw.appearanceTheme
        : DEFAULT_PREFERENCES.appearanceTheme,
    language:
      typeof raw.language === 'string'
        ? raw.language
        : DEFAULT_PREFERENCES.language,
    currency:
      typeof raw.currency === 'string'
        ? raw.currency
        : DEFAULT_PREFERENCES.currency,
  };
}

export function SettingsPageClient({
  embedded = false,
  requireAuthGuard = true,
}: SettingsPageClientProps) {
  const { accessToken } = useAuth();
  const [preferences, setPreferences] =
    useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [isSavingPreferences, setIsSavingPreferences] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [isCheckingMfa, setIsCheckingMfa] = useState(true);
  const [isMfaBusy, setIsMfaBusy] = useState(false);
  const [mfaSetup, setMfaSetup] = useState<MfaSetupPayload | null>(null);
  const [mfaVerificationCode, setMfaVerificationCode] = useState('');
  const [showMfaDisableFlow, setShowMfaDisableFlow] = useState(false);
  const [mfaDisableCode, setMfaDisableCode] = useState('');

  const {
    register,
    reset,
    watch,
    handleSubmit,
    formState: { errors, isSubmitting: isUpdatingPassword },
  } = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    mode: 'onBlur',
  });

  const strength = getPasswordStrength(watch('newPassword') ?? '');

  const enabledEmailCount = useMemo(
    () => Object.values(preferences.notifications.email).filter(Boolean).length,
    [preferences.notifications.email],
  );

  const enabledPushCount = useMemo(
    () => Object.values(preferences.notifications.push).filter(Boolean).length,
    [preferences.notifications.push],
  );

  useEffect(() => {
    let active = true;

    const loadPreferences = async () => {
      try {
        const localPreferences = localStorage.getItem(SETTINGS_STORAGE_KEY);
        if (localPreferences) {
          const parsed = normalizePreferences(JSON.parse(localPreferences));
          if (active && parsed) {
            setPreferences(parsed);
            applyTheme(parsed.appearanceTheme);
          }
        } else {
          applyTheme(DEFAULT_PREFERENCES.appearanceTheme);
        }
      } catch {
        applyTheme(DEFAULT_PREFERENCES.appearanceTheme);
      }

      if (!accessToken) return;

      try {
        const response = await fetch('/api/users/preferences', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (!response.ok) return;

        const data = (await response.json()) as unknown;
        const next = normalizePreferences(data);
        if (active && next) {
          setPreferences(next);
          localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(next));
          applyTheme(next.appearanceTheme);
        }
      } catch {
        // Ignore and keep local fallback.
      }
    };

    void loadPreferences();

    return () => {
      active = false;
    };
  }, [accessToken]);

  useEffect(() => {
    let active = true;

    const checkMfaStatus = async () => {
      if (!accessToken) {
        setIsCheckingMfa(false);
        return;
      }

      try {
        const response = await fetch('/api/auth/mfa/status', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (!response.ok) {
          throw new Error('Unable to read MFA status');
        }

        const data = (await response.json()) as { mfaEnabled?: boolean };
        if (active) {
          setMfaEnabled(Boolean(data.mfaEnabled));
        }
      } catch {
        if (active) {
          setMfaEnabled(false);
        }
      } finally {
        if (active) {
          setIsCheckingMfa(false);
        }
      }
    };

    void checkMfaStatus();

    return () => {
      active = false;
    };
  }, [accessToken]);

  const persistPreferences = async (
    next: UserPreferences,
    previous: UserPreferences,
  ) => {
    setIsSavingPreferences(true);
    setErrorMessage(null);
    setStatusMessage(null);

    setPreferences(next);
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(next));
    applyTheme(next.appearanceTheme);

    try {
      const response = await fetch('/api/users/preferences', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify(next),
      });

      if (!response.ok) {
        throw new Error('Preferences could not be saved');
      }

      setStatusMessage('Preferences updated successfully.');
    } catch {
      setPreferences(previous);
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(previous));
      applyTheme(previous.appearanceTheme);
      setErrorMessage(
        'Unable to sync preferences to the server. Your changes were reverted.',
      );
    } finally {
      setIsSavingPreferences(false);
    }
  };

  const updatePreference = (next: UserPreferences) => {
    const previous = preferences;
    void persistPreferences(next, previous);
  };

  const handleThemeChange = (theme: ThemePreference) => {
    updatePreference({
      ...preferences,
      appearanceTheme: theme,
    });
  };

  const handlePasswordChange = handleSubmit(async (values) => {
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const response = await fetch('/api/users/me/password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          currentPassword: values.currentPassword,
          newPassword: values.newPassword,
        }),
      });

      if (!response.ok) {
        throw new Error('Unable to update password');
      }

      setStatusMessage('Password updated successfully.');
      reset();
    } catch {
      setErrorMessage(
        'Password update failed. Please verify your current password and try again.',
      );
    }
  });

  const startMfaSetup = async () => {
    if (!accessToken) return;
    setIsMfaBusy(true);
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      const response = await fetch('/api/auth/mfa/enable', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ deviceName: 'Chioma Web' }),
      });

      if (!response.ok) {
        throw new Error('Unable to start MFA setup');
      }

      const payload = (await response.json()) as MfaSetupPayload;
      setMfaSetup(payload);
      setStatusMessage(
        'MFA setup started. Scan the QR code and verify with a code.',
      );
    } catch {
      setErrorMessage('MFA setup is unavailable right now.');
    } finally {
      setIsMfaBusy(false);
    }
  };

  const confirmMfaSetup = async () => {
    if (!accessToken || !mfaVerificationCode) return;
    setIsMfaBusy(true);
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      const response = await fetch('/api/auth/mfa/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ token: mfaVerificationCode.trim() }),
      });

      if (!response.ok) {
        throw new Error('Unable to verify MFA token');
      }

      setMfaEnabled(true);
      setMfaSetup(null);
      setMfaVerificationCode('');
      setStatusMessage('MFA enabled successfully.');
    } catch {
      setErrorMessage(
        'Verification failed. Enter a valid code from your authenticator app.',
      );
    } finally {
      setIsMfaBusy(false);
    }
  };

  const disableMfa = async () => {
    if (!accessToken || !mfaDisableCode) return;
    setIsMfaBusy(true);
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      const response = await fetch('/api/auth/mfa/disable', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ token: mfaDisableCode.trim() }),
      });

      if (!response.ok) {
        throw new Error('Unable to disable MFA');
      }

      setMfaEnabled(false);
      setShowMfaDisableFlow(false);
      setMfaDisableCode('');
      setStatusMessage('MFA disabled.');
    } catch {
      setErrorMessage('Unable to disable MFA. Check the code and try again.');
    } finally {
      setIsMfaBusy(false);
    }
  };

  const content = (
    <main className={embedded ? '' : 'min-h-screen bg-gray-100 p-4 md:p-6'}>
      <div className={embedded ? 'space-y-6' : 'mx-auto max-w-5xl space-y-6'}>
        <header>
          <h1 className="text-2xl font-bold text-neutral-900 md:text-3xl">
            Settings & Preferences
          </h1>
          <p className="mt-1 text-sm text-neutral-600">
            Manage your security, notification delivery, appearance, and
            regional preferences.
          </p>
        </header>

        {statusMessage && (
          <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {statusMessage}
          </div>
        )}
        {errorMessage && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        <SettingsCard
          title="Notification Preferences"
          description="Select exactly what should trigger notifications."
        >
          <div className="space-y-2 divide-y divide-neutral-100">
            <PreferenceSwitch
              id="email-new-property"
              label="Email: New property matches"
              checked={preferences.notifications.email.newPropertyMatches}
              disabled={isSavingPreferences}
              onChange={(checked) =>
                updatePreference({
                  ...preferences,
                  notifications: {
                    ...preferences.notifications,
                    email: {
                      ...preferences.notifications.email,
                      newPropertyMatches: checked,
                    },
                  },
                })
              }
            />
            <PreferenceSwitch
              id="email-payment-reminders"
              label="Email: Payment reminders"
              checked={preferences.notifications.email.paymentReminders}
              disabled={isSavingPreferences}
              onChange={(checked) =>
                updatePreference({
                  ...preferences,
                  notifications: {
                    ...preferences.notifications,
                    email: {
                      ...preferences.notifications.email,
                      paymentReminders: checked,
                    },
                  },
                })
              }
            />
            <PreferenceSwitch
              id="email-maintenance-updates"
              label="Email: Maintenance updates"
              checked={preferences.notifications.email.maintenanceUpdates}
              disabled={isSavingPreferences}
              onChange={(checked) =>
                updatePreference({
                  ...preferences,
                  notifications: {
                    ...preferences.notifications,
                    email: {
                      ...preferences.notifications.email,
                      maintenanceUpdates: checked,
                    },
                  },
                })
              }
            />
            <PreferenceSwitch
              id="push-new-messages"
              label="Push: New messages"
              checked={preferences.notifications.push.newMessages}
              disabled={isSavingPreferences}
              onChange={(checked) =>
                updatePreference({
                  ...preferences,
                  notifications: {
                    ...preferences.notifications,
                    push: {
                      ...preferences.notifications.push,
                      newMessages: checked,
                    },
                  },
                })
              }
            />
            <PreferenceSwitch
              id="push-critical-alerts"
              label="Push: Critical alerts"
              checked={preferences.notifications.push.criticalAlerts}
              disabled={isSavingPreferences}
              onChange={(checked) =>
                updatePreference({
                  ...preferences,
                  notifications: {
                    ...preferences.notifications,
                    push: {
                      ...preferences.notifications.push,
                      criticalAlerts: checked,
                    },
                  },
                })
              }
            />
            <PreferenceSwitch
              id="in-app-summary"
              label="In-app notifications summary"
              description="Show a compact daily in-app summary card."
              checked={preferences.notifications.inAppSummary}
              disabled={isSavingPreferences}
              onChange={(checked) =>
                updatePreference({
                  ...preferences,
                  notifications: {
                    ...preferences.notifications,
                    inAppSummary: checked,
                  },
                })
              }
            />
          </div>
          <div className="mt-4 rounded-xl bg-neutral-50 px-4 py-3 text-sm text-neutral-700">
            In-app summary: {enabledEmailCount} email types and{' '}
            {enabledPushCount} push types are currently enabled.
          </div>
        </SettingsCard>

        <SettingsCard
          title="Appearance"
          description="Choose how Chioma should look across sessions."
        >
          <ThemeSelector
            value={preferences.appearanceTheme}
            disabled={isSavingPreferences}
            onChange={handleThemeChange}
          />
        </SettingsCard>

        <SettingsCard
          title="Language & Region"
          description="Set your default language and currency."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label
                htmlFor="language"
                className="mb-2 block text-sm font-medium text-neutral-900"
              >
                Language
              </label>
              <select
                id="language"
                value={preferences.language}
                disabled={isSavingPreferences}
                onChange={(event) =>
                  updatePreference({
                    ...preferences,
                    language: event.target.value,
                  })
                }
                className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-800 outline-none focus:border-brand-blue"
              >
                {LANGUAGE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="currency"
                className="mb-2 block text-sm font-medium text-neutral-900"
              >
                Preferred currency
              </label>
              <select
                id="currency"
                value={preferences.currency}
                disabled={isSavingPreferences}
                onChange={(event) =>
                  updatePreference({
                    ...preferences,
                    currency: event.target.value,
                  })
                }
                className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-800 outline-none focus:border-brand-blue"
              >
                {CURRENCY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </SettingsCard>

        <SettingsCard
          title="Account Security"
          description="Update your password and manage multi-factor authentication."
        >
          <form
            onSubmit={handlePasswordChange}
            className="space-y-4"
            noValidate
          >
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label
                  htmlFor="currentPassword"
                  className="mb-2 block text-sm font-medium text-neutral-900"
                >
                  Current password
                </label>
                <input
                  id="currentPassword"
                  type="password"
                  autoComplete="current-password"
                  {...register('currentPassword')}
                  className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-800 outline-none focus:border-brand-blue"
                />
                {errors.currentPassword && (
                  <p className="mt-1 text-xs text-red-600">
                    {errors.currentPassword.message}
                  </p>
                )}
              </div>
              <div>
                <label
                  htmlFor="newPassword"
                  className="mb-2 block text-sm font-medium text-neutral-900"
                >
                  New password
                </label>
                <input
                  id="newPassword"
                  type="password"
                  autoComplete="new-password"
                  {...register('newPassword')}
                  className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-800 outline-none focus:border-brand-blue"
                />
                {errors.newPassword && (
                  <p className="mt-1 text-xs text-red-600">
                    {errors.newPassword.message}
                  </p>
                )}
              </div>
              <div>
                <label
                  htmlFor="confirmPassword"
                  className="mb-2 block text-sm font-medium text-neutral-900"
                >
                  Confirm new password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  {...register('confirmPassword')}
                  className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-800 outline-none focus:border-brand-blue"
                />
                {errors.confirmPassword && (
                  <p className="mt-1 text-xs text-red-600">
                    {errors.confirmPassword.message}
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-xl bg-neutral-50 p-3">
              <p className="mb-2 text-xs font-medium text-neutral-700">
                Password strength: {strength.label}
              </p>
              <div className="h-2 w-full rounded-full bg-neutral-200">
                <div
                  className="h-2 rounded-full bg-brand-blue transition-all"
                  style={{ width: `${strength.score}%` }}
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isUpdatingPassword}
                className="rounded-xl bg-brand-blue px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-blue-dark disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isUpdatingPassword
                  ? 'Updating password...'
                  : 'Update password'}
              </button>
            </div>
          </form>

          <div className="mt-6 border-t border-neutral-200 pt-6">
            <PreferenceSwitch
              id="mfa-switch"
              label="Multi-factor authentication (MFA)"
              description={
                isCheckingMfa
                  ? 'Checking status...'
                  : mfaEnabled
                    ? 'Enabled. You can disable with a valid authenticator code.'
                    : 'Disabled. Enable MFA to secure your account.'
              }
              checked={mfaEnabled}
              disabled={isCheckingMfa || isMfaBusy}
              onChange={(checked) => {
                if (checked) {
                  void startMfaSetup();
                  return;
                }
                setShowMfaDisableFlow(true);
              }}
            />

            {mfaSetup && (
              <div className="mt-4 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                <h3 className="text-sm font-semibold text-neutral-900">
                  Complete MFA setup
                </h3>
                <p className="mt-1 text-xs text-neutral-600">
                  Scan the QR code with your authenticator app, then enter a
                  generated code to confirm.
                </p>
                {mfaSetup.qrCodeUrl && (
                  <Image
                    src={mfaSetup.qrCodeUrl}
                    alt="MFA QR code for authenticator setup"
                    width={160}
                    height={160}
                    unoptimized
                    className="mt-3 rounded-lg border border-neutral-200 bg-white p-2"
                  />
                )}
                <p className="mt-3 text-xs text-neutral-700">
                  Setup key:{' '}
                  <span className="font-mono">{mfaSetup.secret}</span>
                </p>
                <p className="mt-2 text-xs text-neutral-700">
                  Backup codes:{' '}
                  <span className="font-mono">
                    {mfaSetup.backupCodes.join(', ')}
                  </span>
                </p>
                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                  <input
                    value={mfaVerificationCode}
                    onChange={(event) =>
                      setMfaVerificationCode(event.target.value)
                    }
                    type="text"
                    inputMode="numeric"
                    placeholder="Enter 6-digit code"
                    className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-800 outline-none focus:border-brand-blue sm:max-w-xs"
                  />
                  <button
                    type="button"
                    disabled={!mfaVerificationCode.trim() || isMfaBusy}
                    onClick={() => void confirmMfaSetup()}
                    className="rounded-xl bg-brand-blue px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-blue-dark disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Verify & enable MFA
                  </button>
                </div>
              </div>
            )}

            {showMfaDisableFlow && mfaEnabled && (
              <div className="mt-4 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                <h3 className="text-sm font-semibold text-neutral-900">
                  Disable MFA
                </h3>
                <p className="mt-1 text-xs text-neutral-600">
                  Enter a valid authenticator or backup code to disable MFA.
                </p>
                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                  <input
                    value={mfaDisableCode}
                    onChange={(event) => setMfaDisableCode(event.target.value)}
                    type="text"
                    inputMode="numeric"
                    placeholder="Authenticator or backup code"
                    className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-800 outline-none focus:border-brand-blue sm:max-w-xs"
                  />
                  <button
                    type="button"
                    disabled={!mfaDisableCode.trim() || isMfaBusy}
                    onClick={() => void disableMfa()}
                    className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Disable MFA
                  </button>
                </div>
              </div>
            )}
          </div>
        </SettingsCard>
      </div>
    </main>
  );

  if (!requireAuthGuard) {
    return content;
  }

  return <ProtectedRoute>{content}</ProtectedRoute>;
}
