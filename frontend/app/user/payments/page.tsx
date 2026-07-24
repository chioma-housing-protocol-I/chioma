'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  isAfter,
  isBefore,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  BadgeCheck,
  CheckCircle2,
  Clock3,
  Filter,
  HandCoins,
  Loader2,
  RefreshCcw,
  ReceiptText,
  Search,
} from 'lucide-react';
import { useAuth } from '@/store/authStore';
import { apiClient } from '@/lib/api-client';
import { useModal } from '@/contexts/ModalContext';
import { processStellarRentPayment } from '@/lib/contracts/soroban-client';
import toast from 'react-hot-toast';
import {
  type DashboardPayment,
  loadTenantPayments,
} from '@/lib/dashboard-data';

const statusStyles: Record<DashboardPayment['status'], string> = {
  COMPLETED: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  PENDING: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  FAILED: 'bg-red-500/10 text-red-400 border-red-500/20',
  REFUNDED: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
};

type PaymentFilter = 'all' | DashboardPayment['status'];
type EscrowCycle = {
  escrowId: number;
  agreementReference: string;
  propertyName: string;
  amount: number;
  currency: string;
  dueDate: string;
  disputeFree: boolean;
  released: boolean;
};

const PAGE_SIZE = 6;

export default function TenantPaymentsPage() {
  const { user } = useAuth();
  const { openModal } = useModal();
  const [payments, setPayments] = useState<DashboardPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<PaymentFilter>('all');
  const [page, setPage] = useState(1);
  const [calendarMonth, setCalendarMonth] = useState(startOfMonth(new Date()));
  const [escrowCycles, setEscrowCycles] = useState<EscrowCycle[]>([
    {
      escrowId: 101,
      agreementReference: 'AGR-2025-014',
      propertyName: 'Sunset Apartments, Unit 4B',
      amount: 150000,
      currency: 'USDC',
      dueDate: new Date(
        new Date().setDate(new Date().getDate() + 3),
      ).toISOString(),
      disputeFree: true,
      released: false,
    },
    {
      escrowId: 102,
      agreementReference: 'AGR-2025-014',
      propertyName: 'Sunset Apartments, Unit 4B',
      amount: 150000,
      currency: 'USDC',
      dueDate: new Date(
        new Date().setDate(new Date().getDate() - 10),
      ).toISOString(),
      disputeFree: false,
      released: false,
    },
    {
      escrowId: 103,
      agreementReference: 'AGR-2025-014',
      propertyName: 'Sunset Apartments, Unit 4B',
      amount: 150000,
      currency: 'USDC',
      dueDate: new Date(
        new Date().setDate(new Date().getDate() - 35),
      ).toISOString(),
      disputeFree: true,
      released: true,
    },
  ]);
  const [releasingEscrowId, setReleasingEscrowId] = useState<number | null>(
    null,
  );

  const refreshPayments = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const nextPayments = await loadTenantPayments(user.id);
      setPayments(nextPayments);
    } catch {
      toast.error('Failed to load payments history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refreshPayments();
  }, [user?.id]);

  const sortedPayments = useMemo(
    () =>
      [...payments].sort(
        (a, b) =>
          new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime(),
      ),
    [payments],
  );

  const filteredPayments = useMemo(
    () =>
      sortedPayments.filter((payment) => {
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
        const matchesQuery = haystack.includes(query.toLowerCase());
        const matchesStatus =
          statusFilter === 'all' || payment.status === statusFilter;
        return matchesQuery && matchesStatus;
      }),
    [query, sortedPayments, statusFilter],
  );

  const totalPages = Math.max(
    1,
    Math.ceil(filteredPayments.length / PAGE_SIZE),
  );
  const currentPage = Math.min(page, totalPages);
  const paginatedPayments = filteredPayments.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  const outgoingCompleted = payments.filter(
    (p) => p.direction === 'outgoing' && p.status === 'COMPLETED',
  );
  const totalPaid = outgoingCompleted.reduce((sum, p) => sum + p.amount, 0);
  const totalRefunded = payments
    .filter((p) => p.direction === 'incoming')
    .reduce((sum, p) => sum + p.amount, 0);
  const monthlyRent = outgoingCompleted[0]?.amount ?? 150000;
  const firstPaymentDate = outgoingCompleted.length
    ? outgoingCompleted.reduce((earliest, payment) => {
        const ts = new Date(payment.paymentDate).getTime();
        return ts < earliest ? ts : earliest;
      }, Number.MAX_SAFE_INTEGER)
    : Date.now();
  const hasCompletedPayments = outgoingCompleted.length > 0;
  const activeLeaseStart = useMemo(
    () =>
      startOfMonth(
        hasCompletedPayments
          ? new Date(firstPaymentDate)
          : subMonths(new Date(), 5),
      ),
    [hasCompletedPayments, firstPaymentDate],
  );
  const cycleDates = useMemo(() => {
    const dates: Date[] = [];
    let cursor = activeLeaseStart;
    while (cursor <= endOfMonth(new Date())) {
      dates.push(cursor);
      cursor = addMonths(cursor, 1);
    }
    return dates;
  }, [activeLeaseStart]);

  const totalOwed = cycleDates.length * monthlyRent;
  const overdueCycles = cycleDates.filter((cycleStart) => {
    const cycleEnd = endOfMonth(cycleStart);
    const isCycleClosed = isBefore(cycleEnd, new Date());
    if (!isCycleClosed) {
      return false;
    }
    return !outgoingCompleted.some((payment) =>
      isSameMonth(parseISO(payment.paymentDate), cycleStart),
    );
  });
  const nextDueCycle = cycleDates.find((cycleStart) =>
    isAfter(cycleStart, startOfMonth(new Date())),
  );
  const upcomingPayout = useMemo(() => {
    const now = new Date();
    return escrowCycles
      .filter((cycle) => !cycle.released && cycle.disputeFree)
      .reduce((sum, cycle) => {
        const due = parseISO(cycle.dueDate);
        return isAfter(due, now) ? sum + cycle.amount : sum;
      }, 0);
  }, [escrowCycles]);

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(calendarMonth);
    const monthEnd = endOfMonth(calendarMonth);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const dates = eachDayOfInterval({ start: calendarStart, end: monthEnd });
    return dates;
  }, [calendarMonth]);

  const releaseEscrow = async (cycle: EscrowCycle) => {
    if (!cycle.disputeFree || cycle.released) {
      return;
    }
    setReleasingEscrowId(cycle.escrowId);
    try {
      await apiClient.post(
        `/payments/stellar/escrow/${cycle.escrowId}/release`,
        {
          memo: `Lease payout ${cycle.agreementReference}`,
        },
      );
      setEscrowCycles((prev) =>
        prev.map((item) =>
          item.escrowId === cycle.escrowId ? { ...item, released: true } : item,
        ),
      );
    } catch {
      // Keep this page resilient when backend environments are not fully wired.
    } finally {
      setReleasingEscrowId(null);
    }
  };

  const handlePayRent = () => {
    const primary = outgoingCompleted[0] ?? payments[0];
    openModal('payment', {
      agreementId: primary?.agreementId ?? '',
      amount: monthlyRent,
      onSubmit: async (data: {
        agreementId: string;
        amount: number;
        paymentMethod: string;
        paymentMethodId?: string;
      }) => {
        if (data.paymentMethod === 'crypto') {
          throw new Error('Cryptocurrency payments are currently disabled.');
        }

        if (!data.paymentMethodId) {
          throw new Error('Please select or add a payment method first.');
        }

        await apiClient.post('/payments', {
          agreementId: data.agreementId,
          amount: data.amount,
          paymentMethodId: data.paymentMethodId,
        });

        void refreshPayments();
      },
    });
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-blue-400 mb-2">
              Payment History
            </p>
            <h1 className="text-3xl font-black tracking-tight text-white">
              Track every rent payment and refund
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-blue-200/50">
              Consolidated rent payments, refunds, and references for audit or
              dispute follow-up.
            </p>
          </div>
          <div className="flex w-full flex-col gap-2 lg:w-auto lg:flex-row lg:items-center">
            <button
              type="button"
              onClick={handlePayRent}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              <HandCoins className="h-4 w-4" />
              Pay rent
            </button>
            <div className="relative w-full lg:w-72">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-blue-300/40" />
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="Search payment history"
                className="h-11 w-full rounded-full border border-white/10 bg-white/5 pl-11 pr-4 text-sm text-white placeholder:text-blue-300/30 outline-none focus:border-blue-500/40 focus:ring-2 focus:ring-blue-500/20 transition"
              />
            </div>
            <div className="relative">
              <Filter className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-blue-300/40" />
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as PaymentFilter);
                  setPage(1);
                }}
                className="h-11 w-full appearance-none rounded-full border border-white/10 bg-white/5 pl-11 pr-10 text-sm text-white outline-none focus:border-blue-500/40 focus:ring-2 focus:ring-blue-500/20 transition lg:w-48"
              >
                <option value="all" className="bg-slate-900">
                  All statuses
                </option>
                <option value="COMPLETED" className="bg-slate-900">
                  Completed
                </option>
                <option value="PENDING" className="bg-slate-900">
                  Pending
                </option>
                <option value="FAILED" className="bg-slate-900">
                  Failed
                </option>
                <option value="REFUNDED" className="bg-slate-900">
                  Refunded
                </option>
              </select>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <SummaryCard
            icon={<ArrowUpRight className="h-5 w-5 text-rose-400" />}
            label="Total Paid"
            value={formatCurrency(totalPaid)}
            tone="rose"
          />
          <SummaryCard
            icon={<HandCoins className="h-5 w-5 text-amber-400" />}
            label="Total Owed"
            value={formatCurrency(totalOwed)}
            tone="amber"
          />
          <SummaryCard
            icon={<ArrowDownLeft className="h-5 w-5 text-sky-400" />}
            label="Balance (paid - owed)"
            value={formatCurrency(totalPaid - totalOwed)}
            tone="sky"
          />
        </div>

        {overdueCycles.length > 0 && (
          <div className="mt-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-rose-200">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <AlertTriangle className="h-4 w-4" />
              Overdue payment warning
            </div>
            <p className="mt-1 text-sm text-rose-100/80">
              You have {overdueCycles.length} unpaid cycle
              {overdueCycles.length > 1 ? 's' : ''}. Most recent overdue period:{' '}
              {format(overdueCycles[overdueCycles.length - 1], 'MMM yyyy')}.
            </p>
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-6 lg:col-span-2">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">Payment Calendar</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCalendarMonth((prev) => subMonths(prev, 1))}
                className="rounded-xl border border-white/10 bg-white/5 p-2 text-blue-200/70 hover:bg-white/10"
              >
                <RefreshCcw className="h-4 w-4" />
              </button>
              <button
                onClick={() => setCalendarMonth(startOfMonth(new Date()))}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-blue-200/70 hover:bg-white/10"
              >
                Today
              </button>
            </div>
          </div>
          <div className="mb-4 flex items-center justify-between">
            <button
              onClick={() => setCalendarMonth((prev) => subMonths(prev, 1))}
              className="text-xs text-blue-200/70 hover:text-white"
            >
              Prev
            </button>
            <p className="text-sm font-semibold text-white">
              {format(calendarMonth, 'MMMM yyyy')}
            </p>
            <button
              onClick={() => setCalendarMonth((prev) => addMonths(prev, 1))}
              className="text-xs text-blue-200/70 hover:text-white"
            >
              Next
            </button>
          </div>
          <div className="grid grid-cols-7 gap-2 text-center text-xs text-blue-200/60">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
              <div key={day} className="py-1">
                {day}
              </div>
            ))}
            {calendarDays.map((day) => {
              const hasPayment = outgoingCompleted.some((payment) =>
                isSameDay(parseISO(payment.paymentDate), day),
              );
              const isMonthDueDay =
                day.getDate() === activeLeaseStart.getDate();
              const cycleMissing = overdueCycles.some((cycle) =>
                isSameMonth(cycle, day),
              );
              const isCurrentMonth = isSameMonth(day, calendarMonth);
              const tone = hasPayment
                ? 'border-emerald-500/50 bg-emerald-500/20 text-emerald-300'
                : isMonthDueDay && cycleMissing
                  ? 'border-rose-500/50 bg-rose-500/20 text-rose-300'
                  : isMonthDueDay
                    ? 'border-amber-500/50 bg-amber-500/20 text-amber-300'
                    : 'border-white/10 bg-white/5 text-blue-200/70';
              return (
                <div
                  key={day.toISOString()}
                  className={`rounded-xl border p-2 text-xs ${tone} ${!isCurrentMonth ? 'opacity-50' : ''}`}
                >
                  <div>{format(day, 'd')}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-5">
            <h3 className="text-sm font-semibold text-white">
              Active lease cycle
            </h3>
            <p className="mt-1 text-xs text-blue-200/50">
              Next due:{' '}
              {nextDueCycle ? format(nextDueCycle, 'MMM d, yyyy') : 'N/A'}
            </p>
            <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 p-3">
              <p className="text-xs text-blue-200/50">Monthly rent</p>
              <p className="mt-1 text-lg font-bold text-white">
                {formatCurrency(monthlyRent)}
              </p>
            </div>
          </div>

          {user?.role === 'admin' && (
            <>
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-5">
                <h3 className="text-sm font-semibold text-white">
                  Upcoming Payout
                </h3>
                <p className="mt-2 text-2xl font-black text-emerald-300">
                  {formatCurrency(upcomingPayout)}
                </p>
                <p className="mt-1 text-xs text-blue-200/50">
                  Estimated release from dispute-free escrow cycles.
                </p>
              </div>

              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-5">
                <h3 className="text-sm font-semibold text-white">
                  Escrow Releases
                </h3>
                <div className="mt-3 space-y-3">
                  {escrowCycles.map((cycle) => (
                    <div
                      key={cycle.escrowId}
                      className="rounded-2xl border border-white/10 bg-white/5 p-3"
                    >
                      <p className="text-xs text-blue-200/60">
                        {cycle.propertyName}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-white">
                        {formatCurrency(cycle.amount, cycle.currency)}
                      </p>
                      <p className="mt-1 text-xs text-blue-200/40">
                        Due {format(parseISO(cycle.dueDate), 'MMM d, yyyy')}
                      </p>
                      <button
                        disabled={
                          !cycle.disputeFree ||
                          cycle.released ||
                          releasingEscrowId === cycle.escrowId
                        }
                        onClick={() => void releaseEscrow(cycle)}
                        className="mt-3 inline-flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-300 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {releasingEscrowId === cycle.escrowId ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : cycle.released ? (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        ) : (
                          <BadgeCheck className="h-3.5 w-3.5" />
                        )}
                        {cycle.released
                          ? 'Released'
                          : cycle.disputeFree
                            ? 'Release escrow'
                            : 'Blocked by dispute'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/5 px-6 py-5">
          <div>
            <h2 className="text-lg font-bold text-white">Ledger entries</h2>
            <p className="text-sm text-blue-200/40">
              Payment references, dates, counterparties, and statuses.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full bg-white/5 border border-white/10 px-3 py-1 text-xs font-semibold text-blue-200/40">
            <Clock3 className="h-3.5 w-3.5" />
            Showing {paginatedPayments.length} of {filteredPayments.length}
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-64 items-center justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/10 border-t-blue-500" />
          </div>
        ) : filteredPayments.length === 0 ? (
          <div className="flex min-h-64 flex-col items-center justify-center px-6 text-center">
            <ReceiptText className="h-10 w-10 text-blue-300/20 mb-4" />
            <p className="text-lg font-semibold text-white">
              No matching payments
            </p>
            <p className="mt-1 max-w-md text-sm text-blue-200/40">
              Adjust the search term to find a reference, property, or payment
              note.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-white/5 text-xs font-bold uppercase tracking-widest text-blue-300/30">
                <tr>
                  <th className="px-6 py-4">Transaction</th>
                  <th className="px-6 py-4">Counterparty</th>
                  <th className="px-6 py-4">Method</th>
                  <th className="px-6 py-4">Reference</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {paginatedPayments.map((payment) => (
                  <tr
                    key={payment.id}
                    className="hover:bg-white/5 transition-colors align-top"
                  >
                    <td className="px-6 py-4">
                      <p className="font-semibold text-white">
                        {payment.propertyName}
                      </p>
                      <p className="mt-0.5 text-xs text-blue-200/40">
                        {payment.agreementReference} ·{' '}
                        {format(new Date(payment.paymentDate), 'MMM d, yyyy')}
                      </p>
                      {payment.notes && (
                        <p className="mt-1 text-xs text-blue-200/30">
                          {payment.notes}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-blue-200/60">
                      {payment.counterpartyName}
                    </td>
                    <td className="px-6 py-4 text-blue-200/60">
                      {payment.paymentMethod}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-blue-200/40">
                      {payment.referenceNumber ?? 'Not available'}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={
                          payment.direction === 'incoming'
                            ? 'font-bold text-emerald-400'
                            : 'font-bold text-white'
                        }
                      >
                        {payment.direction === 'incoming' ? '+' : '-'}
                        {formatCurrency(payment.amount, payment.currency)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-bold border ${statusStyles[payment.status]}`}
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

        {!loading && filteredPayments.length > 0 && (
          <div className="flex items-center justify-between border-t border-white/5 px-6 py-4 text-xs">
            <p className="text-blue-200/50">
              Page {currentPage} of {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-blue-200/70 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Prev
              </button>
              <button
                disabled={currentPage >= totalPages}
                onClick={() =>
                  setPage((prev) => Math.min(totalPages, prev + 1))
                }
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-blue-200/70 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
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
  tone: 'rose' | 'sky' | 'emerald' | 'amber';
}) {
  const toneMap = {
    rose: 'bg-rose-500/10 border-rose-500/20',
    sky: 'bg-sky-500/10 border-sky-500/20',
    emerald: 'bg-emerald-500/10 border-emerald-500/20',
    amber: 'bg-amber-500/10 border-amber-500/20',
  };
  return (
    <div className={`rounded-2xl border ${toneMap[tone]} p-5`}>
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 border border-white/10">
        {icon}
      </div>
      <p className="mt-4 text-sm font-medium text-blue-200/50">{label}</p>
      <p className="mt-1 text-2xl font-black tracking-tight text-white">
        {value}
      </p>
    </div>
  );
}

function formatCurrency(amount: number, currency = 'USDC') {
  return `$${new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(amount)} ${currency}`;
}
