'use client';

import React, { useMemo, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { LogIn } from 'lucide-react';
import { BaseModal } from '@/components/modals/BaseModal';
import { notify } from '@/components/ui';
import { useAuth } from '@/store/authStore';
import type { PropertyInquiryData } from '@/components/modals/types';
import {
  propertyInquirySchema,
  type PropertyInquiryFormData,
} from '@/lib/validation/forms';

interface PropertyInquiryModalProps {
  isOpen: boolean;
  onClose: () => void;
  propertyId?: string;
  propertyTitle?: string;
  onSubmit?: (data: PropertyInquiryData) => Promise<void>;
}

export const PropertyInquiryModal: React.FC<PropertyInquiryModalProps> = ({
  isOpen,
  onClose,
  propertyId = '',
  propertyTitle = 'this property',
  onSubmit,
}) => {
  const { user, isAuthenticated } = useAuth();
  const pathname = usePathname();

  const initialMessage = useMemo(
    () =>
      `Hello, I am interested in ${propertyTitle}. Please share next steps.`,
    [propertyTitle],
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PropertyInquiryFormData>({
    resolver: zodResolver(propertyInquirySchema),
    defaultValues: {
      propertyId,
      propertyTitle,
      name: '',
      email: '',
      phone: '',
      message: initialMessage,
    },
  });

  useEffect(() => {
    if (!isOpen) return;
    const knownName =
      isAuthenticated && user
        ? `${user.firstName} ${user.lastName}`.trim()
        : '';
    reset({
      propertyId,
      propertyTitle,
      name: knownName,
      email: isAuthenticated && user ? user.email : '',
      phone: '',
      message: initialMessage,
    });
  }, [initialMessage, isOpen, propertyId, propertyTitle, isAuthenticated, user, reset]);

  const onFormSubmit = async (data: PropertyInquiryFormData) => {
    if (!onSubmit) return;
    try {
      await onSubmit({
        propertyId: data.propertyId ?? '',
        propertyTitle: data.propertyTitle ?? '',
        name: data.name,
        email: data.email,
        phone: data.phone || undefined,
        message: data.message,
      });
      notify.success('Inquiry sent successfully');
      onClose();
    } catch (error) {
      notify.error(
        error instanceof Error ? error.message : 'Failed to send inquiry',
      );
    }
  };

  if (!isAuthenticated) {
    const loginHref = `/login?next=${encodeURIComponent(pathname || '/properties')}`;

    return (
      <BaseModal
        isOpen={isOpen}
        onClose={onClose}
        title="Sign in required"
        subtitle={`Sign in to contact the host about ${propertyTitle}`}
        size="md"
        footer={
          <div className="flex w-full justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-100"
            >
              Cancel
            </button>
            <Link
              href={loginHref}
              onClick={onClose}
              className="flex items-center gap-2 rounded-xl bg-brand-blue px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              <LogIn size={16} />
              Sign in
            </Link>
          </div>
        }
      >
        <p className="text-sm text-neutral-600">
          Create a free account or sign in so the host knows who they&apos;re
          talking to and can reach you back.
        </p>
      </BaseModal>
    );
  }

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Property Inquiry"
      subtitle={`Contact the host about ${propertyTitle}`}
      size="md"
      footer={
        <div className="flex w-full justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="property-inquiry-form"
            disabled={isSubmitting}
            className="rounded-xl bg-brand-blue px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {isSubmitting ? 'Sending...' : 'Send Inquiry'}
          </button>
        </div>
      }
    >
      <form
        id="property-inquiry-form"
        onSubmit={handleSubmit(onFormSubmit)}
        noValidate
        className="space-y-4"
      >
        <div>
          <label className="mb-1 block text-sm font-semibold text-neutral-700">
            Name *
          </label>
          <input
            {...register('name')}
            className="w-full rounded-xl border border-neutral-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
            placeholder="Your full name"
          />
          {errors.name && (
            <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>
          )}
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold text-neutral-700">
            Email *
          </label>
          <input
            type="email"
            {...register('email')}
            className="w-full rounded-xl border border-neutral-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
            placeholder="name@email.com"
          />
          {errors.email && (
            <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
          )}
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold text-neutral-700">
            Phone
          </label>
          <input
            {...register('phone')}
            className="w-full rounded-xl border border-neutral-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
            placeholder="+1 555 123 4567"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold text-neutral-700">
            Message *
          </label>
          <textarea
            {...register('message')}
            rows={5}
            className="w-full rounded-xl border border-neutral-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
          />
          {errors.message && (
            <p className="mt-1 text-xs text-red-600">
              {errors.message.message}
            </p>
          )}
        </div>
      </form>
    </BaseModal>
  );
};