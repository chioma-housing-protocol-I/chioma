'use client';

import React, { useEffect, useState } from 'react';
import { BaseModal } from './BaseModal';
import { notify } from '@/components/ui';
import type { AgreementSigningData } from './types';

interface AgreementSigningModalProps {
  isOpen: boolean;
  onClose: () => void;
  agreementId?: string;
  signerName?: string;
  onSubmit?: (data: AgreementSigningData) => Promise<void>;
}

export const AgreementSigningModal: React.FC<AgreementSigningModalProps> = ({
  isOpen,
  onClose,
  agreementId = '',
  signerName = '',
  onSubmit,
}) => {
  const [form, setForm] = useState<AgreementSigningData>({
    agreementId,
    signerName,
    signature: '',
    acceptedTerms: false,
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setForm({
      agreementId,
      signerName,
      signature: '',
      acceptedTerms: false,
    });
    setError('');
  }, [agreementId, isOpen, signerName]);

  const validate = () => {
    if (!form.signerName.trim()) return 'Signer name is required';
    if (!form.signature.trim() || form.signature.trim().length < 3) {
      return 'Please provide a valid e-signature';
    }
    if (!form.acceptedTerms) return 'You must accept the terms before signing';
    return '';
  };

  const handleSign = async () => {
    if (!onSubmit) return;
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError('');
    setIsSubmitting(true);
    try {
      await onSubmit({
        ...form,
        signature: form.signature.trim(),
        signedAt: new Date().toISOString(),
      });
      notify.success('Agreement signed successfully');
      onClose();
    } catch (err) {
      notify.error(
        err instanceof Error ? err.message : 'Unable to sign agreement',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Sign Agreement"
      subtitle="Complete e-signature to finalize this agreement"
      size="md"
      footer={
        <div className="flex w-full justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-100"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSign}
            disabled={isSubmitting}
            className="rounded-xl bg-brand-blue px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {isSubmitting ? 'Signing...' : 'Sign Agreement'}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-semibold text-neutral-700">
            Signer name *
          </label>
          <input
            value={form.signerName}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, signerName: e.target.value }))
            }
            className="w-full rounded-xl border border-neutral-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-semibold text-neutral-700">
            E-signature *
          </label>
          <input
            value={form.signature}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, signature: e.target.value }))
            }
            placeholder="Type your full name as signature"
            className="w-full rounded-xl border border-neutral-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
          />
          <p className="mt-1 text-xs text-neutral-500">
            Typing your legal name acts as your electronic signature.
          </p>
        </div>

        <label className="flex items-start gap-2 rounded-xl border border-neutral-200 bg-neutral-50 p-3">
          <input
            type="checkbox"
            checked={form.acceptedTerms}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, acceptedTerms: e.target.checked }))
            }
            className="mt-0.5 h-4 w-4 rounded border-neutral-300 text-brand-blue focus:ring-brand-blue"
          />
          <span className="text-sm text-neutral-700">
            I confirm that I have read and accepted the agreement terms.
          </span>
        </label>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
            {error}
          </p>
        )}
      </div>
    </BaseModal>
  );
};
