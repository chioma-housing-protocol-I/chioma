'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { useForm } from 'react-hook-form';

export type MfaDeviceFormValues = {
  name: string;
  type: 'totp' | 'sms' | 'email' | 'webauthn';
};

interface MfaDeviceFormProps {
  onSubmit: (data: MfaDeviceFormValues) => void | Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

const DEVICE_TYPES = [
  {
    value: 'totp',
    label: 'Authenticator App',
    icon: '🔐',
    description: 'Use an authenticator app like Google Authenticator or Authy',
  },
  {
    value: 'sms',
    label: 'SMS',
    icon: '📱',
    description: 'Receive codes via text message',
  },
  {
    value: 'email',
    label: 'Email',
    icon: '📧',
    description: 'Receive codes via email',
  },
  {
    value: 'webauthn',
    label: 'Security Key',
    icon: '🔑',
    description: 'Use a hardware security key',
  },
];

export function MfaDeviceForm({
  onSubmit,
  onCancel,
  isLoading = false,
}: MfaDeviceFormProps) {
  const [selectedType, setSelectedType] =
    useState<MfaDeviceFormValues['type']>('totp');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<MfaDeviceFormValues>({
    defaultValues: {
      name: '',
      type: 'totp',
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-lg font-bold text-white">Add New MFA Device</h3>
        <button
          type="button"
          onClick={onCancel}
          className="p-2 text-blue-200/60 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Device Name
          </label>
          <input
            {...register('name', { required: 'Device name is required' })}
            type="text"
            placeholder="e.g., My iPhone, Work Phone"
            className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-blue-200/40 focus:outline-none focus:bg-white/10 focus:border-blue-500 transition-all"
            disabled={isLoading}
          />
          {errors.name && (
            <p className="text-sm text-rose-400 mt-1">{errors.name.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-white mb-3">
            Device Type
          </label>
          <div className="space-y-2">
            {DEVICE_TYPES.map((type) => (
              <label
                key={type.value}
                className="flex items-start gap-3 p-3 rounded-xl border border-white/10 cursor-pointer hover:border-white/20 transition-all bg-white/5 has-[:checked]:bg-purple-500/10 has-[:checked]:border-purple-500/30"
              >
                <input
                  type="radio"
                  value={type.value}
                  {...register('type')}
                  onChange={() =>
                    setSelectedType(type.value as MfaDeviceFormValues['type'])
                  }
                  className="mt-1 accent-purple-500"
                  disabled={isLoading}
                />
                <div className="flex-1">
                  <p className="text-sm font-medium text-white flex items-center gap-2">
                    <span>{type.icon}</span>
                    {type.label}
                  </p>
                  <p className="text-xs text-blue-200/60 mt-1">
                    {type.description}
                  </p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {selectedType === 'totp' && (
          <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-4">
            <p className="text-sm text-blue-200">
              Download an authenticator app like Google Authenticator, Microsoft
              Authenticator, or Authy. You&apos;ll scan a QR code to set up your
              device.
            </p>
          </div>
        )}

        {selectedType === 'sms' && (
          <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-4">
            <p className="text-sm text-blue-200">
              You&apos;ll receive verification codes via SMS to your registered
              phone number.
            </p>
          </div>
        )}

        {selectedType === 'email' && (
          <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-4">
            <p className="text-sm text-blue-200">
              You&apos;ll receive verification codes via email to your
              registered email address.
            </p>
          </div>
        )}

        {selectedType === 'webauthn' && (
          <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-4">
            <p className="text-sm text-blue-200">
              Use a hardware security key like YubiKey, Titan, or Windows Hello.
            </p>
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isLoading}
          className="flex-1 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl font-semibold transition-colors"
        >
          {isLoading ? 'Adding...' : 'Continue Setup'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className="flex-1 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl font-semibold transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
