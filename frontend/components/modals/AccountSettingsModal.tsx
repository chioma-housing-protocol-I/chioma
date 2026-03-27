'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Lock,
  Bell,
  Shield,
  Eye,
  EyeOff,
  CheckCircle2,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { BaseModal } from './BaseModal';

type Tab = 'security' | 'notifications' | 'privacy' | 'danger';

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
      .regex(/[0-9]/, 'Must contain at least one number'),
    confirmPassword: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type PasswordFormValues = z.infer<typeof passwordSchema>;

export interface AccountSettingsData {
  notifications?: {
    emailPayments: boolean;
    emailDisputes: boolean;
    emailMaintenance: boolean;
    smsAlerts: boolean;
  };
  privacy?: {
    showProfile: boolean;
    showContactInfo: boolean;
  };
}

interface AccountSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings?: AccountSettingsData;
  onSaveSettings?: (data: AccountSettingsData) => Promise<void>;
  onChangePassword?: (
    currentPassword: string,
    newPassword: string,
  ) => Promise<void>;
  onDeleteAccount?: () => Promise<void>;
}

export const AccountSettingsModal: React.FC<AccountSettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  onChangePassword,
  onDeleteAccount,
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('security');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  const [notifications, setNotifications] = useState({
    emailPayments: settings?.notifications?.emailPayments ?? true,
    emailDisputes: settings?.notifications?.emailDisputes ?? true,
    emailMaintenance: settings?.notifications?.emailMaintenance ?? true,
    smsAlerts: settings?.notifications?.smsAlerts ?? false,
  });

  const [privacy, setPrivacy] = useState({
    showProfile: settings?.privacy?.showProfile ?? true,
    showContactInfo: settings?.privacy?.showContactInfo ?? false,
  });

  const {
    register,
    handleSubmit,
    reset: resetPassword,
    formState: { errors: pwErrors, isSubmitting: isPwSubmitting },
  } = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
  });

  const handlePasswordSubmit = async (values: PasswordFormValues) => {
    if (!onChangePassword) return;
    try {
      await onChangePassword(values.currentPassword, values.newPassword);
      toast.success('Password changed successfully');
      resetPassword();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to change password',
      );
    }
  };

  const handleSaveNotifications = async () => {
    if (!onSaveSettings) return;
    try {
      await onSaveSettings({ notifications, privacy });
      toast.success('Notification preferences saved');
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to save settings',
      );
    }
  };

  const handleSavePrivacy = async () => {
    if (!onSaveSettings) return;
    try {
      await onSaveSettings({ notifications, privacy });
      toast.success('Privacy settings saved');
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to save settings',
      );
    }
  };

  const handleDeleteAccount = async () => {
    if (!onDeleteAccount || deleteConfirm !== 'DELETE') return;
    setIsDeletingAccount(true);
    try {
      await onDeleteAccount();
      toast.success('Account deletion initiated');
      onClose();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to delete account',
      );
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'security', label: 'Security', icon: <Lock size={16} /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell size={16} /> },
    { id: 'privacy', label: 'Privacy', icon: <Shield size={16} /> },
    { id: 'danger', label: 'Danger Zone', icon: <AlertTriangle size={16} /> },
  ];

  const ToggleSwitch = ({
    checked,
    onChange,
    label,
    description,
  }: {
    checked: boolean;
    onChange: (v: boolean) => void;
    label: string;
    description?: string;
  }) => (
    <label className="flex items-center justify-between gap-4 cursor-pointer py-3 border-b border-neutral-100 dark:border-neutral-800 last:border-0">
      <div>
        <p className="font-semibold text-neutral-900 dark:text-white text-sm">
          {label}
        </p>
        {description && (
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            {description}
          </p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${
          checked ? 'bg-brand-blue' : 'bg-neutral-300 dark:bg-neutral-600'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </label>
  );

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Account Settings"
      subtitle="Manage your security, notifications, and privacy"
      size="lg"
    >
      <div className="flex gap-6 min-h-[400px]">
        {/* Sidebar */}
        <nav className="w-44 shrink-0 space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors text-left ${
                activeTab === tab.id
                  ? tab.id === 'danger'
                    ? 'bg-red-50 dark:bg-red-900/20 text-red-600'
                    : 'bg-blue-50 dark:bg-blue-900/20 text-brand-blue'
                  : tab.id === 'danger'
                    ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10'
                    : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-white/5'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Security Tab */}
          {activeTab === 'security' && (
            <form
              onSubmit={handleSubmit(handlePasswordSubmit)}
              noValidate
              className="space-y-4"
            >
              <h3 className="text-base font-bold text-neutral-900 dark:text-white mb-4">
                Change Password
              </h3>

              {[
                {
                  field: 'currentPassword' as const,
                  label: 'Current Password',
                  show: showCurrentPw,
                  toggle: () => setShowCurrentPw((v) => !v),
                },
                {
                  field: 'newPassword' as const,
                  label: 'New Password',
                  show: showNewPw,
                  toggle: () => setShowNewPw((v) => !v),
                },
                {
                  field: 'confirmPassword' as const,
                  label: 'Confirm New Password',
                  show: showConfirmPw,
                  toggle: () => setShowConfirmPw((v) => !v),
                },
              ].map(({ field, label, show, toggle }) => (
                <div key={field}>
                  <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
                    {label}
                  </label>
                  <div className="relative">
                    <input
                      {...register(field)}
                      type={show ? 'text' : 'password'}
                      className="w-full px-4 py-2.5 pr-12 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-blue"
                    />
                    <button
                      type="button"
                      onClick={toggle}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
                      aria-label={show ? 'Hide password' : 'Show password'}
                    >
                      {show ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {pwErrors[field] && (
                    <p className="text-xs text-red-500 mt-1">
                      {pwErrors[field]?.message}
                    </p>
                  )}
                </div>
              ))}

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isPwSubmitting}
                  className="px-6 py-2.5 rounded-xl font-bold text-white bg-brand-blue hover:bg-blue-700 shadow-md transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isPwSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={18} />
                      Update Password
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-neutral-900 dark:text-white mb-4">
                Notification Preferences
              </h3>
              <div className="bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl p-4">
                <ToggleSwitch
                  checked={notifications.emailPayments}
                  onChange={(v) =>
                    setNotifications((n) => ({ ...n, emailPayments: v }))
                  }
                  label="Payment Notifications"
                  description="Receive emails for payment confirmations and reminders"
                />
                <ToggleSwitch
                  checked={notifications.emailDisputes}
                  onChange={(v) =>
                    setNotifications((n) => ({ ...n, emailDisputes: v }))
                  }
                  label="Dispute Updates"
                  description="Get notified when disputes are filed or updated"
                />
                <ToggleSwitch
                  checked={notifications.emailMaintenance}
                  onChange={(v) =>
                    setNotifications((n) => ({ ...n, emailMaintenance: v }))
                  }
                  label="Maintenance Requests"
                  description="Updates on maintenance request status changes"
                />
                <ToggleSwitch
                  checked={notifications.smsAlerts}
                  onChange={(v) =>
                    setNotifications((n) => ({ ...n, smsAlerts: v }))
                  }
                  label="SMS Alerts"
                  description="Receive urgent alerts via text message"
                />
              </div>
              <button
                type="button"
                onClick={handleSaveNotifications}
                className="px-6 py-2.5 rounded-xl font-bold text-white bg-brand-blue hover:bg-blue-700 shadow-md transition-colors flex items-center gap-2"
              >
                <CheckCircle2 size={18} />
                Save Preferences
              </button>
            </div>
          )}

          {/* Privacy Tab */}
          {activeTab === 'privacy' && (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-neutral-900 dark:text-white mb-4">
                Privacy Settings
              </h3>
              <div className="bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl p-4">
                <ToggleSwitch
                  checked={privacy.showProfile}
                  onChange={(v) =>
                    setPrivacy((p) => ({ ...p, showProfile: v }))
                  }
                  label="Public Profile"
                  description="Allow other users to view your profile"
                />
                <ToggleSwitch
                  checked={privacy.showContactInfo}
                  onChange={(v) =>
                    setPrivacy((p) => ({ ...p, showContactInfo: v }))
                  }
                  label="Show Contact Info"
                  description="Display your phone number and email on your profile"
                />
              </div>
              <button
                type="button"
                onClick={handleSavePrivacy}
                className="px-6 py-2.5 rounded-xl font-bold text-white bg-brand-blue hover:bg-blue-700 shadow-md transition-colors flex items-center gap-2"
              >
                <CheckCircle2 size={18} />
                Save Settings
              </button>
            </div>
          )}

          {/* Danger Zone Tab */}
          {activeTab === 'danger' && (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-red-600 mb-4">
                Danger Zone
              </h3>
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 rounded-2xl p-6">
                <div className="flex items-start gap-3 mb-4">
                  <AlertTriangle
                    className="text-red-600 shrink-0 mt-0.5"
                    size={20}
                  />
                  <div>
                    <p className="font-bold text-red-900 dark:text-red-100">
                      Delete Account
                    </p>
                    <p className="text-sm text-red-800 dark:text-red-200 mt-1">
                      This will permanently delete your account and all
                      associated data. This action cannot be undone.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="block text-sm font-semibold text-red-800 dark:text-red-200">
                    Type{' '}
                    <span className="font-mono bg-red-100 dark:bg-red-900/40 px-1.5 py-0.5 rounded">
                      DELETE
                    </span>{' '}
                    to confirm
                  </label>
                  <input
                    type="text"
                    value={deleteConfirm}
                    onChange={(e) => setDeleteConfirm(e.target.value)}
                    placeholder="DELETE"
                    className="w-full px-4 py-2.5 bg-white dark:bg-neutral-800 border-2 border-red-300 dark:border-red-700 rounded-xl text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                  <button
                    type="button"
                    onClick={handleDeleteAccount}
                    disabled={
                      deleteConfirm !== 'DELETE' ||
                      isDeletingAccount ||
                      !onDeleteAccount
                    }
                    className="px-6 py-2.5 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {isDeletingAccount ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 size={18} />
                        Delete My Account
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </BaseModal>
  );
};
