'use client';

import { ShieldCheck } from 'lucide-react';
import { useAuth } from '@/store/authStore';
import { useKycStatus } from '@/lib/query/hooks/use-kyc-status';
import { KycStatusBadge } from '@/components/kyc/KycStatusBadge';
import { KycSubmissionForm } from '@/components/kyc/KycSubmissionForm';

const STATUS_COPY: Record<string, string> = {
  PENDING:
    'Your documents are under review. This usually takes 1–2 business days.',
  APPROVED: 'Your identity is verified. You have full access to the platform.',
  REJECTED:
    'Your verification was rejected. Review the reason below and resubmit.',
  NEEDS_INFO:
    'We need more information to complete your verification. Please resubmit.',
};

export default function UserVerificationPage() {
  const { user } = useAuth();
  const { data: kyc, isLoading, isError } = useKycStatus();
  const status = kyc?.status ?? null;
  const canSubmit = !status || status === 'REJECTED' || status === 'NEEDS_INFO';

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="text-blue-400" size={24} />
          <h1 className="text-2xl font-bold text-white">
            Identity verification
          </h1>
        </div>
        {!isLoading && <KycStatusBadge status={status} />}
      </header>

      <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
        {isLoading ? (
          <p className="text-sm text-blue-200/60">
            Loading verification status…
          </p>
        ) : isError ? (
          <p role="alert" className="text-sm text-red-300">
            We could not load your verification status. Please try again.
          </p>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-blue-100/80">
              {status
                ? STATUS_COPY[status]
                : 'Verify your identity to unlock payments, agreements, and higher limits.'}
            </p>
            {kyc?.reason && status !== 'APPROVED' ? (
              <p className="text-sm text-red-200/80">Reason: {kyc.reason}</p>
            ) : null}
          </div>
        )}
      </section>

      {!isLoading && !isError && canSubmit ? (
        <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <h2 className="mb-4 text-lg font-bold text-white">
            {status ? 'Resubmit your details' : 'Submit your details'}
          </h2>
          <KycSubmissionForm
            defaultValues={{
              firstName: user?.firstName,
              lastName: user?.lastName,
              email: user?.email,
            }}
          />
        </section>
      ) : null}
    </div>
  );
}
