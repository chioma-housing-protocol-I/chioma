'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { format } from 'date-fns';
import {
  ArrowDownLeft,
  ArrowUpRight,
  BadgeCheck,
  Clock3,
  ReceiptText,
  Search,
} from 'lucide-react';
import { useAuth } from '@/store/authStore';
import {
  type DashboardPayment,
  loadTenantPayments,
} from '@/lib/dashboard-data';

const statusStyles: Record<DashboardPayment['status'], string> = {
  COMPLETED: 'bg-emerald-100 text-emerald-700',
  PENDING: 'bg-amber-100 text-amber-700',
  FAILED: 'bg-rose-100 text-rose-700',
  REFUNDED: 'bg-sky-100 text-sky-700',
};

export default function TenantPaymentsPage() {
  const { user } = useAuth();
  const [payments, setPayments] = useState<DashboardPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    let active = true;

    const run = async () => {
      setLoading(true);
      const nextPayments = await loadTenantPayments(user?.id);
      if (active) {
        setPayments(nextPayments);
        setLoading(false);
      }
    };

    void run();

    return () => {
      active = false;
    };
  }, [user?.id]);

  const filteredPayments = payments.filter((payment) => {
    const haystack = [
      payment.propertyName,
      payment.counterpartyName,
      payment.paymentMethod,
      payment.referenceNumber,
      payment.notes,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return haystack.includes(query.toLowerCase());
  });

  const totalPaid = payments
    .filter((payment) => payment.direction === 'outgoing')
    .reduce((sum, payment) => sum + payment.amount, 0);
  const totalRefunded = payments
    .filter((payment) => payment.direction === 'incoming')
    .reduce((sum, payment) => sum + payment.amount, 0);

  return (
    <div className="space-y-8">
      <section className="rounded-[2rem] border border-slate-200 bg-linear-to-br from-white via-white to-slate-50 p-6 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-700">
              Payment History
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
              Track every rent payment and refund
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-slate-600">
              This view consolidates completed rent payments, refunds, and the
              references you need for audit or dispute follow-up.
            </p>
          </div>

          <div className="relative w-full lg:w-80">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search payment history"
              className="h-12 w-full rounded-full border border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-700 outline-hidden transition focus:border-blue-400"
            />
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <SummaryCard
            icon={<ArrowUpRight className="h-5 w-5 text-rose-600" />}
            label="Rent paid"
            value={formatCurrency(totalPaid)}
            tone="rose"
          />
          <SummaryCard
            icon={<ArrowDownLeft className="h-5 w-5 text-sky-600" />}
            label="Refunds received"
            value={formatCurrency(totalRefunded)}
            tone="sky"
          />
          <SummaryCard
            icon={<BadgeCheck className="h-5 w-5 text-emerald-600" />}
            label="Confirmed records"
            value={`${payments.filter((payment) => payment.status === 'COMPLETED').length}`}
            tone="emerald"
          />
        </div>
      </section>

      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Ledger entries
            </h2>
            <p className="text-sm text-slate-500">
              Payment references, dates, counterparties, and statuses.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            <Clock3 className="h-4 w-4" />
            Latest {payments.length} records
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-80 items-center justify-center">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
          </div>
        ) : filteredPayments.length === 0 ? (
          <div className="flex min-h-80 flex-col items-center justify-center px-6 text-center">
            <ReceiptText className="h-12 w-12 text-slate-300" />
            <p className="mt-4 text-lg font-semibold text-slate-900">
              No matching payments
            </p>
            <p className="mt-2 max-w-md text-sm text-slate-500">
              Adjust the search term to find a reference, property, or payment
              note.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                <tr>
                  <th className="px-6 py-4">Transaction</th>
                  <th className="px-6 py-4">Counterparty</th>
                  <th className="px-6 py-4">Method</th>
                  <th className="px-6 py-4">Reference</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPayments.map((payment) => (
                  <tr key={payment.id} className="align-top">
                    <td className="px-6 py-4">
                      <p className="font-semibold text-slate-900">
                        {payment.propertyName}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {payment.agreementReference} •{' '}
                        {format(new Date(payment.paymentDate), 'MMM d, yyyy')}
                      </p>
                      {payment.notes ? (
                        <p className="mt-2 text-xs text-slate-500">
                          {payment.notes}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {payment.counterpartyName}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {payment.paymentMethod}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-500">
                      {payment.referenceNumber ?? 'Not available'}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={
                          payment.direction === 'incoming'
                            ? 'font-semibold text-emerald-700'
                            : 'font-semibold text-slate-900'
                        }
                      >
                        {payment.direction === 'incoming' ? '+' : '-'}
                        {formatCurrency(payment.amount, payment.currency)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[payment.status]}`}
                      >
                        {payment.status.replace('_', ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  tone: 'rose' | 'sky' | 'emerald';
}) {
  const backgroundMap = {
    rose: 'from-rose-50 to-white',
    sky: 'from-sky-50 to-white',
    emerald: 'from-emerald-50 to-white',
  };

  return (
    <div
      className={`rounded-[1.5rem] border border-slate-200 bg-linear-to-br ${backgroundMap[tone]} p-5`}
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white shadow-sm">
        {icon}
      </div>
      <p className="mt-4 text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
        {value}
      </p>
    </div>
  );
}

function formatCurrency(amount: number, currency = 'NGN') {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}
