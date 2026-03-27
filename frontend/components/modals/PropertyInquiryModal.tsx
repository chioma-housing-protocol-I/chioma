'use client';

import React, { useMemo, useState } from 'react';
import { BaseModal } from './BaseModal';
import { notify } from '@/components/ui';
import type { PropertyInquiryData } from './types';

interface PropertyInquiryModalProps {
  isOpen: boolean;
  onClose: () => void;
  propertyId?: string;
  propertyTitle?: string;
  onSubmit?: (data: PropertyInquiryData) => Promise<void>;
}

type FormErrors = Partial<Record<keyof PropertyInquiryData, string>>;

export const PropertyInquiryModal: React.FC<PropertyInquiryModalProps> = ({
  isOpen,
  onClose,
  propertyId = '',
  propertyTitle = 'this property',
  onSubmit,
}) => {
  const [form, setForm] = useState<PropertyInquiryData>({
    propertyId,
    propertyTitle,
    name: '',
    email: '',
    phone: '',
    message: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const initialMessage = useMemo(
    () =>
      `Hello, I am interested in ${propertyTitle}. Please share next steps.`,
    [propertyTitle],
  );

  React.useEffect(() => {
    if (!isOpen) return;
    setForm({
      propertyId,
      propertyTitle,
      name: '',
      email: '',
      phone: '',
      message: initialMessage,
    });
    setErrors({});
  }, [initialMessage, isOpen, propertyId, propertyTitle]);

  const validate = () => {
    const nextErrors: FormErrors = {};
    if (!form.name.trim()) nextErrors.name = 'Name is required';
    if (!form.email.trim()) nextErrors.email = 'Email is required';
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) {
      nextErrors.email = 'Enter a valid email address';
    }
    if (!form.message.trim()) nextErrors.message = 'Message is required';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!onSubmit) return;
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await onSubmit(form);
      notify.success('Inquiry sent successfully');
      onClose();
    } catch (error) {
      notify.error(
        error instanceof Error ? error.message : 'Failed to send inquiry',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

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
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="rounded-xl bg-brand-blue px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {isSubmitting ? 'Sending...' : 'Send Inquiry'}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-semibold text-neutral-700">
            Name *
          </label>
          <input
            value={form.name}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, name: e.target.value }))
            }
            className="w-full rounded-xl border border-neutral-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
            placeholder="Your full name"
          />
          {errors.name && (
            <p className="mt-1 text-xs text-red-600">{errors.name}</p>
          )}
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold text-neutral-700">
            Email *
          </label>
          <input
            type="email"
            value={form.email}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, email: e.target.value }))
            }
            className="w-full rounded-xl border border-neutral-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
            placeholder="name@email.com"
          />
          {errors.email && (
            <p className="mt-1 text-xs text-red-600">{errors.email}</p>
          )}
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold text-neutral-700">
            Phone
          </label>
          <input
            value={form.phone}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, phone: e.target.value }))
            }
            className="w-full rounded-xl border border-neutral-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
            placeholder="+1 555 123 4567"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold text-neutral-700">
            Message *
          </label>
          <textarea
            value={form.message}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, message: e.target.value }))
            }
            rows={5}
            className="w-full rounded-xl border border-neutral-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
          />
          {errors.message && (
            <p className="mt-1 text-xs text-red-600">{errors.message}</p>
          )}
        </div>
      </div>
    </BaseModal>
  );
};
