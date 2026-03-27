'use client';

import { X } from 'lucide-react';
import { useForm } from 'react-hook-form';

export type ProfileMetadataFormValues = {
  key: string;
  label: string;
  value: string;
  type: 'text' | 'url' | 'email' | 'phone' | 'select';
  isPublic: boolean;
};

interface MetadataField {
  id: string;
  key: string;
  value: string;
  type: 'text' | 'url' | 'email' | 'phone' | 'select';
  label: string;
  isPublic: boolean;
  isCustom: boolean;
}

interface ProfileMetadataFormProps {
  field?: MetadataField;
  onSubmit: (data: ProfileMetadataFormValues) => void | Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function ProfileMetadataForm({
  field,
  onSubmit,
  onCancel,
  isLoading = false,
}: ProfileMetadataFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileMetadataFormValues>({
    defaultValues: field
      ? {
          key: field.key,
          label: field.label,
          value: field.value,
          type: field.type,
          isPublic: field.isPublic,
        }
      : {
          key: '',
          label: '',
          value: '',
          type: 'text',
          isPublic: true,
        },
  });

  const FIELD_TYPES = [
    { value: 'text', label: 'Text' },
    { value: 'url', label: 'URL' },
    { value: 'email', label: 'Email' },
    { value: 'phone', label: 'Phone' },
    { value: 'select', label: 'Select' },
  ];

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-lg font-bold text-white">
          {field ? 'Edit Field' : 'Add New Field'}
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
              Field Label
            </label>
            <input
              {...register('label', { required: 'Label is required' })}
              type="text"
              placeholder="e.g., Bio"
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-blue-200/40 focus:outline-none focus:bg-white/10 focus:border-blue-500 transition-all"
              disabled={isLoading || !!field}
            />
            {errors.label && (
              <p className="text-sm text-rose-400 mt-1">
                {errors.label.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Field Key
            </label>
            <input
              {...register('key', { required: 'Key is required' })}
              type="text"
              placeholder="e.g., bio"
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-blue-200/40 focus:outline-none focus:bg-white/10 focus:border-blue-500 transition-all font-mono text-sm"
              disabled={isLoading || !!field}
            />
            {errors.key && (
              <p className="text-sm text-rose-400 mt-1">{errors.key.message}</p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Field Type
          </label>
          <select
            {...register('type')}
            className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:bg-white/10 focus:border-blue-500 transition-all appearance-none"
            disabled={isLoading || !!field}
          >
            {FIELD_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Value
          </label>
          <textarea
            {...register('value')}
            placeholder="Enter field value"
            rows={3}
            className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-blue-200/40 focus:outline-none focus:bg-white/10 focus:border-blue-500 transition-all resize-none"
            disabled={isLoading}
          />
        </div>

        <div className="flex items-center gap-3">
          <input
            {...register('isPublic')}
            type="checkbox"
            className="accent-teal-500"
            disabled={isLoading}
          />
          <label className="text-sm text-white">
            Make this field public (visible to other users)
          </label>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isLoading}
          className="flex-1 px-4 py-2.5 bg-teal-600 hover:bg-teal-500 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl font-semibold transition-colors"
        >
          {isLoading ? 'Saving...' : 'Save Field'}
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
