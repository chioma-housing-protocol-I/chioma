'use client';

import { X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import type { ApiKey } from './ApiKeysList';

export type ApiKeyFormValues = {
  name: string;
  description: string;
  permissions: string[];
  expiresAt: string;
};

interface ApiKeyFormProps {
  apiKey?: ApiKey;
  onSubmit: (data: ApiKeyFormValues) => void | Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

const AVAILABLE_PERMISSIONS = [
  'properties:read',
  'properties:write',
  'leases:read',
  'leases:write',
  'payments:read',
  'payments:write',
  'users:read',
  'users:write',
  'maintenance:read',
  'maintenance:write',
  'documents:read',
  'documents:write',
  'analytics:read',
  'webhooks:read',
  'webhooks:write',
];

export function ApiKeyForm({ apiKey, onSubmit, onCancel, isLoading = false }: ApiKeyFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ApiKeyFormValues>({
    defaultValues: apiKey
      ? {
          name: apiKey.name,
          description: apiKey.description ?? '',
          permissions: apiKey.permissions,
          expiresAt: apiKey.expiresAt
            ? new Date(apiKey.expiresAt).toISOString().split('T')[0]
            : '',
        }
      : { name: '', description: '', permissions: [], expiresAt: '' },
  });

  const today = new Date().toISOString().split('T')[0];

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-lg font-bold text-white">
          {apiKey ? 'Edit API Key' : 'New API Key'}
        </h3>
        <button type="button" onClick={onCancel} className="p-2 text-blue-200/60 hover:text-white transition-colors">
          <X size={20} />
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-white mb-2">Key Name *</label>
          <input
            {...register('name', { required: 'Name is required' })}
            placeholder="e.g. Production Integration"
            className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-blue-200/40 focus:outline-none focus:bg-white/10 focus:border-blue-500 transition-all"
            disabled={isLoading}
          />
          {errors.name && <p className="text-sm text-rose-400 mt-1">{errors.name.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-white mb-2">Description</label>
          <input
            {...register('description')}
            placeholder="Optional description for this key"
            className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-blue-200/40 focus:outline-none focus:bg-white/10 focus:border-blue-500 transition-all"
            disabled={isLoading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-white mb-3">Permissions / Scopes *</label>
          <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
            {AVAILABLE_PERMISSIONS.map((perm) => (
              <label
                key={perm}
                className="flex items-center gap-2 p-2 rounded-lg bg-white/5 border border-white/10 cursor-pointer hover:border-white/20 transition-all"
              >
                <input
                  type="checkbox"
                  value={perm}
                  {...register('permissions', { required: 'Select at least one permission' })}
                  className="accent-cyan-500"
                  disabled={isLoading}
                />
                <span className="text-xs text-white">{perm}</span>
              </label>
            ))}
          </div>
          {errors.permissions && (
            <p className="text-sm text-rose-400 mt-1">{errors.permissions.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-white mb-2">Expiration Date</label>
          <input
            {...register('expiresAt')}
            type="date"
            min={today}
            className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:bg-white/10 focus:border-blue-500 transition-all [color-scheme:dark]"
            disabled={isLoading}
          />
          <p className="text-xs text-blue-200/60 mt-1.5">Leave blank for a non-expiring key</p>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isLoading}
          className="flex-1 px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl font-semibold transition-colors"
        >
          {isLoading ? 'Saving...' : apiKey ? 'Save Changes' : 'Generate Key'}
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
