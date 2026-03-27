'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { User, Mail, Phone, MapPin, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { BaseModal } from './BaseModal';

const schema = z.object({
  firstName: z
    .string()
    .min(1, 'First name is required')
    .max(50, 'First name cannot exceed 50 characters'),
  lastName: z
    .string()
    .min(1, 'Last name is required')
    .max(50, 'Last name cannot exceed 50 characters'),
  email: z.string().email('Please enter a valid email address'),
  phone: z
    .string()
    .optional()
    .refine(
      (val) => !val || /^\+?[\d\s\-().]{7,20}$/.test(val),
      'Please enter a valid phone number',
    ),
  bio: z.string().max(300, 'Bio cannot exceed 300 characters').optional(),
  location: z
    .string()
    .max(100, 'Location cannot exceed 100 characters')
    .optional(),
});

type FormValues = z.infer<typeof schema>;

export interface UserProfileData {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  bio?: string;
  location?: string;
}

interface UserProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile?: Partial<UserProfileData>;
  onSubmit?: (data: UserProfileData) => Promise<void>;
}

export const UserProfileEditModal: React.FC<UserProfileEditModalProps> = ({
  isOpen,
  onClose,
  profile,
  onSubmit,
}) => {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: profile?.firstName ?? '',
      lastName: profile?.lastName ?? '',
      email: profile?.email ?? '',
      phone: profile?.phone ?? '',
      bio: profile?.bio ?? '',
      location: profile?.location ?? '',
    },
  });

  const bio = watch('bio');

  const handleClose = () => {
    reset();
    onClose();
  };

  const onFormSubmit = async (values: FormValues) => {
    if (!onSubmit) return;
    try {
      await onSubmit({
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        phone: values.phone || undefined,
        bio: values.bio || undefined,
        location: values.location || undefined,
      });
      toast.success('Profile updated successfully');
      handleClose();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to update profile',
      );
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Edit Profile"
      subtitle="Update your personal information"
      size="md"
      footer={
        <div className="flex items-center justify-end gap-3 w-full">
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="px-6 py-2.5 rounded-xl font-bold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="profile-edit-form"
            disabled={isSubmitting || !isDirty}
            className="px-6 py-2.5 rounded-xl font-bold text-white bg-brand-blue hover:bg-blue-700 shadow-md transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <CheckCircle2 size={18} />
                Save Changes
              </>
            )}
          </button>
        </div>
      }
    >
      <form
        id="profile-edit-form"
        onSubmit={handleSubmit(onFormSubmit)}
        noValidate
        className="space-y-6"
      >
        {/* Name */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-brand-blue/10 rounded-xl flex items-center justify-center">
              <User className="text-brand-blue" size={20} />
            </div>
            <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
              Personal Information
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
                First Name *
              </label>
              <input
                {...register('firstName')}
                type="text"
                placeholder="Jane"
                className="w-full px-4 py-2.5 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-blue"
              />
              {errors.firstName && (
                <p className="text-xs text-red-500 mt-1">
                  {errors.firstName.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
                Last Name *
              </label>
              <input
                {...register('lastName')}
                type="text"
                placeholder="Doe"
                className="w-full px-4 py-2.5 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-blue"
              />
              {errors.lastName && (
                <p className="text-xs text-red-500 mt-1">
                  {errors.lastName.message}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Contact */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2 flex items-center gap-2">
              <Mail size={16} />
              Email Address *
            </label>
            <input
              {...register('email')}
              type="email"
              placeholder="jane@example.com"
              className="w-full px-4 py-2.5 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-blue"
            />
            {errors.email && (
              <p className="text-xs text-red-500 mt-1">
                {errors.email.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2 flex items-center gap-2">
              <Phone size={16} />
              Phone Number
            </label>
            <input
              {...register('phone')}
              type="tel"
              placeholder="+1 (555) 123-4567"
              className="w-full px-4 py-2.5 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-blue"
            />
            {errors.phone && (
              <p className="text-xs text-red-500 mt-1">
                {errors.phone.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2 flex items-center gap-2">
              <MapPin size={16} />
              Location
            </label>
            <input
              {...register('location')}
              type="text"
              placeholder="Lagos, Nigeria"
              className="w-full px-4 py-2.5 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-blue"
            />
            {errors.location && (
              <p className="text-xs text-red-500 mt-1">
                {errors.location.message}
              </p>
            )}
          </div>
        </div>

        {/* Bio */}
        <div>
          <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
            Bio
          </label>
          <textarea
            {...register('bio')}
            rows={3}
            placeholder="Tell others a bit about yourself..."
            className="w-full px-4 py-3 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-blue resize-none"
          />
          <div className="flex items-center justify-between mt-1">
            {errors.bio ? (
              <p className="text-xs text-red-500">{errors.bio.message}</p>
            ) : (
              <span />
            )}
            <p className="text-xs text-neutral-500 ml-auto">
              {bio?.length ?? 0}/300
            </p>
          </div>
        </div>
      </form>
    </BaseModal>
  );
};
