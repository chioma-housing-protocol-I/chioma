'use client';

import { X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import type { Role } from '@/types';

type RoleFormValues = {
  name: string;
  description?: string | null;
};

interface RoleFormProps {
  role?: Role;
  onSubmit: (data: RoleFormValues) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function RoleForm({
  role,
  onSubmit,
  onCancel,
  isLoading = false,
}: RoleFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: role
      ? {
          name: role.name,
          description: role.description,
        }
      : {
          name: '',
          description: '',
        },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-lg font-bold text-white">
          {role ? 'Edit Role' : 'Create New Role'}
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
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Role Name
          </label>
          <input
            {...register('name', { required: 'Role name is required' })}
            type="text"
            placeholder="e.g., moderator"
            className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-blue-200/40 focus:outline-none focus:bg-white/10 focus:border-blue-500 transition-all"
            disabled={isLoading}
          />
          {errors.name && (
            <p className="text-sm text-rose-400 mt-1">{errors.name.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Description
          </label>
          <textarea
            {...register('description')}
            placeholder="Describe what this role does..."
            rows={4}
            className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-blue-200/40 focus:outline-none focus:bg-white/10 focus:border-blue-500 transition-all resize-none"
            disabled={isLoading}
          />
        </div>
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isLoading}
          className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl font-semibold transition-colors"
        >
          {isLoading ? 'Saving...' : 'Save Role'}
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
