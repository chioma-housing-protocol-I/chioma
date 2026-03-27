'use client';

import { X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import type { Permission } from '@/types';

type PermissionFormValues = {
  name: string;
  action: string;
  resource: string;
  description?: string | null;
};

interface PermissionFormProps {
  permission?: Permission;
  onSubmit: (data: PermissionFormValues) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

const RESOURCES = [
  'users',
  'roles',
  'permissions',
  'audit',
  'system',
  'properties',
  'leases',
  'payments',
];

const ACTIONS = ['create', 'read', 'update', 'delete', 'export', 'import'];

export function PermissionForm({
  permission,
  onSubmit,
  onCancel,
  isLoading = false,
}: PermissionFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: permission
      ? {
          name: permission.name,
          action: permission.action,
          resource: permission.resource,
          description: permission.description,
        }
      : {
          name: '',
          action: '',
          resource: '',
          description: '',
        },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-lg font-bold text-white">
          {permission ? 'Edit Permission' : 'Create New Permission'}
        </h3>
        <button
          type="button"
          onClick={onCancel}
          className="p-2 text-blue-200/60 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Resource
            </label>
            <select
              {...register('resource', { required: 'Resource is required' })}
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:bg-white/10 focus:border-blue-500 transition-all"
              disabled={isLoading}
            >
              <option value="">Select resource...</option>
              {RESOURCES.map((resource) => (
                <option key={resource} value={resource}>
                  {resource.charAt(0).toUpperCase() + resource.slice(1)}
                </option>
              ))}
            </select>
            {errors.resource && (
              <p className="text-sm text-rose-400 mt-1">
                {errors.resource.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Action
            </label>
            <select
              {...register('action', { required: 'Action is required' })}
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:bg-white/10 focus:border-blue-500 transition-all"
              disabled={isLoading}
            >
              <option value="">Select action...</option>
              {ACTIONS.map((action) => (
                <option key={action} value={action}>
                  {action.charAt(0).toUpperCase() + action.slice(1)}
                </option>
              ))}
            </select>
            {errors.action && (
              <p className="text-sm text-rose-400 mt-1">
                {errors.action.message}
              </p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Permission Code
          </label>
          <input
            {...register('name', { required: 'Permission code is required' })}
            type="text"
            placeholder="e.g., user:create:admin"
            className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-blue-200/40 focus:outline-none focus:bg-white/10 focus:border-blue-500 transition-all font-mono"
            disabled={isLoading}
          />
          {errors.name && (
            <p className="text-sm text-rose-400 mt-1">{errors.name.message}</p>
          )}
          <p className="text-xs text-blue-200/60 mt-2">
            Unique identifier for this permission. Use lowercase and hyphens.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Description
          </label>
          <textarea
            {...register('description')}
            placeholder="What does this permission allow?"
            rows={3}
            className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-blue-200/40 focus:outline-none focus:bg-white/10 focus:border-blue-500 transition-all resize-none"
            disabled={isLoading}
          />
        </div>
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isLoading}
          className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl font-semibold transition-colors"
        >
          {isLoading ? 'Saving...' : 'Save Permission'}
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
