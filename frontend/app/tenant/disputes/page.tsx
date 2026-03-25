'use client';

import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { format } from 'date-fns';
import {
  AlertCircle,
  CircleDollarSign,
  FilePlus2,
  MessageSquareText,
  Scale,
} from 'lucide-react';
import { useAuth } from '@/store/authStore';
import {
  type DashboardDispute,
  type DisputeType,
  loadTenantDisputes,
  submitDispute,
} from '@/lib/dashboard-data';

const disputeTypes: DisputeType[] = [
  'RENT_PAYMENT',
  'SECURITY_DEPOSIT',
  'PROPERTY_DAMAGE',
  'MAINTENANCE',
  'TERMINATION',
  'OTHER',
];

const statusStyles: Record<DashboardDispute['status'], string> = {
  OPEN: 'bg-amber-100 text-amber-700',
  UNDER_REVIEW: 'bg-blue-100 text-blue-700',
  RESOLVED: 'bg-emerald-100 text-emerald-700',
  REJECTED: 'bg-rose-100 text-rose-700',
  WITHDRAWN: 'bg-slate-100 text-slate-600',
};

export default function TenantDisputesPage() {
  const { user } = useAuth();
  const [disputes, setDisputes] = useState<DashboardDispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    agreementId: '',
    disputeType: 'MAINTENANCE' as DisputeType,
    description: '',
    requestedAmount: '',
  });

  useEffect(() => {
    let active = true;

    const run = async () => {
      setLoading(true);
      const nextDisputes = await loadTenantDisputes();
      if (active) {
        setDisputes(nextDisputes);
        setLoading(false);
      }
    };

    void run();

    return () => {
      active = false;
    };
  }, [user?.id]);

  const activeDisputes = disputes.filter(
    (dispute) => dispute.status === 'OPEN' || dispute.status === 'UNDER_REVIEW',
  ).length;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.description.trim()) return;

    setIsSubmitting(true);
    await submitDispute({
      agreementId: form.agreementId || 'manual-agreement',
      disputeType: form.disputeType,
      description: form.description.trim(),
      requestedAmount: form.requestedAmount
        ? Number(form.requestedAmount)
        : undefined,
    });

    setDisputes((current) => [
      {
        id: `local-${Date.now()}`,
        disputeId: `DSP-${new Date().getFullYear()}-${current.length + 1}`,
        agreementReference: form.agreementId || 'Manual agreement',
        propertyName: 'Pending agreement lookup',
        counterpartyName: 'Landlord',
        disputeType: form.disputeType,
        description: form.description.trim(),
        status: 'OPEN',
        requestedAmount: form.requestedAmount
          ? Number(form.requestedAmount)
          : undefined,
        evidenceCount: 0,
        commentCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      ...current,
    ]);

    setForm({
      agreementId: '',
      disputeType: 'MAINTENANCE',
      description: '',
      requestedAmount: '',
    });
    setIsSubmitting(false);
  };

  return (
    <div className="space-y-8">
      <section className="rounded-[2rem] border border-slate-200 bg-linear-to-br from-white via-slate-50 to-blue-50 p-6 text-slate-900 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-700">
              Dispute Resolution
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
              Raise issues before they become lease risk
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-slate-600">
              The backend dispute module already exists. This dashboard now lets
              tenants document incidents, track reviews, and keep a visible
              paper trail from first complaint to resolution.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Metric label="Open or under review" value={`${activeDisputes}`} />
            <Metric
              label="Resolved disputes"
              value={`${disputes.filter((dispute) => dispute.status === 'RESOLVED').length}`}
            />
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-5">
            <h2 className="text-lg font-semibold text-slate-900">
              Case tracker
            </h2>
            <p className="text-sm text-slate-500">
              Monitor status, evidence counts, and the last update on each case.
            </p>
          </div>

          {loading ? (
            <div className="flex min-h-80 items-center justify-center">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {disputes.map((dispute) => (
                <article key={dispute.id} className="px-6 py-6">
                  <div className="space-y-5">
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                        {dispute.disputeId}
                      </p>
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[dispute.status]}`}
                      >
                        {dispute.status.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
                      <div className="space-y-3">
                        <div>
                          <h3 className="text-lg font-semibold text-slate-900">
                            {dispute.propertyName}
                          </h3>
                          <p className="mt-1 text-sm text-slate-500">
                            {dispute.agreementReference} • Against{' '}
                            {dispute.counterpartyName}
                          </p>
                        </div>

                        <p className="max-w-2xl text-sm leading-7 text-slate-600">
                          {dispute.description}
                        </p>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                        <MiniStat
                          icon={<Scale className="h-4 w-4 text-blue-600" />}
                          label="Type"
                          value={dispute.disputeType.replace('_', ' ')}
                        />
                        <MiniStat
                          icon={
                            <FilePlus2 className="h-4 w-4 text-amber-600" />
                          }
                          label="Evidence"
                          value={`${dispute.evidenceCount}`}
                        />
                        <MiniStat
                          icon={
                            <MessageSquareText className="h-4 w-4 text-emerald-600" />
                          }
                          label="Comments"
                          value={`${dispute.commentCount}`}
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-slate-100 pt-4 text-xs text-slate-500">
                      <span>
                        Opened{' '}
                        {format(new Date(dispute.createdAt), 'MMM d, yyyy')}
                      </span>
                      <span>
                        Last updated{' '}
                        {format(new Date(dispute.updatedAt), 'MMM d, yyyy')}
                      </span>
                      {typeof dispute.requestedAmount === 'number' ? (
                        <span>
                          Requested amount{' '}
                          {formatCurrency(dispute.requestedAmount)}
                        </span>
                      ) : null}
                    </div>

                    {dispute.resolution ? (
                      <div className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                        <span className="font-semibold">Resolution:</span>{' '}
                        {dispute.resolution}
                      </div>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50">
              <AlertCircle className="h-6 w-6 text-rose-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Raise a new dispute
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Capture the agreement reference, dispute type, summary, and any
                amount in question.
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">
                Agreement ID
              </span>
              <input
                value={form.agreementId}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    agreementId: event.target.value,
                  }))
                }
                placeholder="AGR-2025-014"
                className="mt-2 h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-hidden transition focus:border-blue-400"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-700">Type</span>
              <select
                value={form.disputeType}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    disputeType: event.target.value as DisputeType,
                  }))
                }
                className="mt-2 h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-hidden transition focus:border-blue-400"
              >
                {disputeTypes.map((type) => (
                  <option key={type} value={type}>
                    {type.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-700">
                Requested amount
              </span>
              <div className="relative mt-2">
                <CircleDollarSign className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={form.requestedAmount}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      requestedAmount: event.target.value,
                    }))
                  }
                  inputMode="numeric"
                  placeholder="40000"
                  className="h-12 w-full rounded-2xl border border-slate-200 pl-11 pr-4 text-sm outline-hidden transition focus:border-blue-400"
                />
              </div>
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-700">
                What happened?
              </span>
              <textarea
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                rows={6}
                placeholder="Describe the issue, the timeline, and the outcome you are requesting."
                className="mt-2 w-full rounded-[1.5rem] border border-slate-200 px-4 py-3 text-sm outline-hidden transition focus:border-blue-400"
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || form.description.trim().length < 10}
            className="mt-6 inline-flex h-12 items-center justify-center rounded-full bg-slate-900 px-6 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? 'Submitting...' : 'Submit dispute'}
          </button>
        </form>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-white px-5 py-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
        {value}
      </p>
    </div>
  );
}

function MiniStat({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
        {icon}
        {label}
      </div>
      <p className="mt-2 text-sm font-semibold leading-6 text-slate-900">
        {value}
      </p>
    </div>
  );
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(amount);
}
