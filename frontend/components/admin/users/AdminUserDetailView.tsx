'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ActivityTimeline } from '@/components/admin/ActivityTimeline';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { UserAvatar } from '@/components/admin/users/UserAvatar';
import { useAdminUserDetailBundle } from '@/lib/query/hooks/use-admin-user-detail';
import { useUserTransactions } from '@/lib/query/hooks/use-transactions';
import {
  useActivateUser,
  useSuspendUser,
  useVerifyUser,
} from '@/lib/query/hooks/use-admin-users';
import type { KycStatus } from '@/types';
import type { Transaction } from '@/types';
import {
  ArrowLeft,
  Ban,
  Building2,
  Calendar,
  CheckCircle2,
  CreditCard,
  FileCheck2,
  Loader2,
  Mail,
  Phone,
  Shield,
  UserCheck,
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const KYC_BADGE: Record<KycStatus, string> = {
  PENDING: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  APPROVED: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  REJECTED: 'bg-red-500/15 text-red-300 border-red-500/30',
  NEEDS_INFO: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
};

function kycLabel(s: KycStatus): string {
  return s.replace(/_/g, ' ');
}

function txStatusClass(status: Transaction['status']): string {
  switch (status) {
    case 'completed':
      return 'text-emerald-400';
    case 'pending':
      return 'text-amber-400';
    case 'failed':
      return 'text-red-400';
    default:
      return 'text-slate-400';
  }
}

export interface AdminUserDetailViewProps {
  userId: string;
}

export function AdminUserDetailView({ userId }: AdminUserDetailViewProps) {
  const router = useRouter();
  const { data, isLoading, isError, refetch } =
    useAdminUserDetailBundle(userId);
  const { data: txPage, isLoading: txLoading } = useUserTransactions(userId);

  const suspendUser = useSuspendUser();
  const activateUser = useActivateUser();
  const verifyUser = useVerifyUser();

  const [confirmSuspend, setConfirmSuspend] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  /** Overrides server mock when suspend/activate succeeds before detail payload updates. */
  const [localSuspended, setLocalSuspended] = useState<boolean | null>(null);

  const user = data?.user;
  const extras = data?.extras;

  const handleSuspend = async () => {
    setActionLoading(true);
    try {
      await suspendUser.mutateAsync(userId);
      setLocalSuspended(true);
      toast.success('User suspended');
      setConfirmSuspend(false);
      await refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not suspend user');
    } finally {
      setActionLoading(false);
    }
  };

  const handleActivate = async () => {
    setActionLoading(true);
    try {
      await activateUser.mutateAsync(userId);
      setLocalSuspended(false);
      toast.success('User reactivated');
      await refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not reactivate user');
    } finally {
      setActionLoading(false);
    }
  };

  const handleVerify = async () => {
    setActionLoading(true);
    try {
      await verifyUser.mutateAsync(userId);
      toast.success('User marked verified');
      await refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not verify user');
    } finally {
      setActionLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 text-blue-200/80">
        <Loader2 className="animate-spin" size={32} />
        <p className="text-sm">Loading user…</p>
      </div>
    );
  }

  if (isError || !user || !extras) {
    return (
      <div className="max-w-md mx-auto text-center space-y-4 py-16 px-4">
        <p className="text-white font-semibold">Could not load user</p>
        <p className="text-slate-400 text-sm">
          Try again or return to the user list.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <button
            type="button"
            onClick={() => refetch()}
            className="text-sky-400 hover:text-sky-300 font-medium"
          >
            Retry
          </button>
          <Link
            href="/admin/users"
            className="text-slate-400 hover:text-white text-sm"
          >
            Back to users
          </Link>
        </div>
      </div>
    );
  }

  const transactions = txPage?.data ?? [];
  const suspended =
    localSuspended !== null
      ? localSuspended
      : extras.accountStatus === 'suspended';

  return (
    <div className="space-y-6 sm:space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-4">
          <button
            type="button"
            onClick={() => router.push('/admin/users')}
            className="p-3 bg-white/5 hover:bg-white/10 text-white rounded-xl border border-white/10 transition-all text-sm group shrink-0"
            aria-label="Back to users"
          >
            <ArrowLeft
              size={18}
              className="group-hover:-translate-x-1 transition-transform"
            />
          </button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              {user.name || 'User'}
            </h1>
            <p className="text-blue-200/60 mt-1 text-sm">
              Profile, KYC, properties, transactions, and activity
            </p>
          </div>
        </div>
        <Link
          href="/admin/users"
          className="text-sm text-sky-400 hover:text-sky-300 self-start sm:self-auto"
        >
          All users
        </Link>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 lg:gap-8">
        <div className="xl:col-span-1 space-y-6">
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <UserAvatar
                name={user.name}
                email={user.email}
                src={user.avatar}
                sizeClassName="w-24 h-24 border-4 border-slate-700 bg-slate-800"
                textClassName="text-3xl"
                iconSize={40}
              />
              <div>
                <h2 className="text-xl font-bold text-white">
                  {user.name || 'Unknown'}
                </h2>
                <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    {user.role}
                  </span>
                  {user.isVerified ? (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Verified
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      Unverified
                    </span>
                  )}
                  {suspended && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium uppercase tracking-wider bg-red-500/10 text-red-400 border border-red-500/20">
                      Suspended
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 space-y-3 text-sm text-slate-300">
              <div className="flex items-center gap-3">
                <Mail size={16} className="text-slate-500 shrink-0" />
                <span className="break-all">{user.email}</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone size={16} className="text-slate-500 shrink-0" />
                {user.phone || '—'}
              </div>
              <div className="flex items-center gap-3">
                <Calendar size={16} className="text-slate-500 shrink-0" />
                Joined {format(new Date(user.createdAt), 'MMM d, yyyy')}
              </div>
            </div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-2 text-white font-semibold">
              <Shield className="text-violet-400" size={20} />
              KYC status
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`text-xs font-semibold px-3 py-1 rounded-lg border uppercase tracking-wide ${KYC_BADGE[extras.kycStatus]}`}
              >
                {kycLabel(extras.kycStatus)}
              </span>
              {extras.kycUpdatedAt && (
                <span className="text-xs text-slate-500">
                  Updated {format(new Date(extras.kycUpdatedAt), 'MMM d, yyyy')}
                </span>
              )}
            </div>
            {extras.kycNotes && (
              <p className="text-sm text-slate-400 leading-relaxed">
                {extras.kycNotes}
              </p>
            )}
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-2 text-white font-semibold">
              <FileCheck2 className="text-amber-400" size={20} />
              Admin actions
            </div>
            <p className="text-xs text-slate-500">
              Changes may require backend support; actions are retried on
              failure.
            </p>
            <div className="flex flex-col gap-2">
              {!user.isVerified && (
                <button
                  type="button"
                  disabled={actionLoading || verifyUser.isPending}
                  onClick={() => void handleVerify()}
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl font-semibold text-sm bg-emerald-600/90 hover:bg-emerald-600 text-white border border-emerald-500/40 disabled:opacity-50"
                >
                  <UserCheck size={18} />
                  Mark verified
                </button>
              )}
              {!suspended ? (
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => setConfirmSuspend(true)}
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl font-semibold text-sm bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/30 disabled:opacity-50"
                >
                  <Ban size={18} />
                  Suspend account
                </button>
              ) : (
                <button
                  type="button"
                  disabled={actionLoading || activateUser.isPending}
                  onClick={() => void handleActivate()}
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl font-semibold text-sm bg-sky-600/90 hover:bg-sky-600 text-white border border-sky-500/40 disabled:opacity-50"
                >
                  <CheckCircle2 size={18} />
                  Reactivate account
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="xl:col-span-2 space-y-6">
          <section className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
              <div className="flex items-center gap-2 text-white font-semibold">
                <Building2 className="text-blue-400" size={20} />
                Properties & agreements
              </div>
              <span className="text-xs text-slate-500">
                {extras.agreementCount} active agreement
                {extras.agreementCount === 1 ? '' : 's'}
              </span>
            </div>
            {extras.properties.length === 0 ? (
              <p className="text-slate-500 text-sm">No linked properties.</p>
            ) : (
              <ul className="divide-y divide-slate-800">
                {extras.properties.map((p) => (
                  <li
                    key={p.id}
                    className="py-3 first:pt-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
                  >
                    <div>
                      <p className="text-white font-medium">{p.title}</p>
                      <p className="text-slate-500 text-sm">{p.address}</p>
                    </div>
                    <div className="flex flex-wrap gap-2 shrink-0">
                      <span className="text-xs px-2 py-0.5 rounded-lg bg-white/10 text-slate-300 capitalize">
                        {p.role}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-lg border border-white/10 text-slate-400 capitalize">
                        {p.status}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="bg-slate-900/90 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
            <div className="p-6 pb-2 flex items-center gap-2 text-white font-semibold border-b border-slate-800">
              <CreditCard className="text-emerald-400" size={20} />
              Transactions
            </div>
            {txLoading ? (
              <div className="flex justify-center py-12 text-blue-200/80">
                <Loader2 className="animate-spin" size={24} />
              </div>
            ) : transactions.length === 0 ? (
              <p className="p-6 text-slate-500 text-sm">
                No transactions found.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-slate-500 text-xs uppercase tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="px-4 py-3 font-medium">Type</th>
                      <th className="px-4 py-3 font-medium">Amount</th>
                      <th className="px-4 py-3 font-medium hidden sm:table-cell">
                        Status
                      </th>
                      <th className="px-4 py-3 font-medium hidden md:table-cell">
                        Date
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {transactions.slice(0, 25).map((tx) => (
                      <tr key={tx.id} className="hover:bg-white/5">
                        <td className="px-4 py-3">
                          <span className="text-white capitalize">
                            {tx.type}
                          </span>
                          <p className="text-slate-500 text-xs mt-0.5 line-clamp-2 md:hidden">
                            {tx.status} ·{' '}
                            {format(new Date(tx.createdAt), 'MMM d, yyyy')}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-white whitespace-nowrap">
                          {tx.amount.toLocaleString()} {tx.currency}
                        </td>
                        <td
                          className={`px-4 py-3 capitalize hidden sm:table-cell ${txStatusClass(tx.status)}`}
                        >
                          {tx.status}
                        </td>
                        <td className="px-4 py-3 text-slate-500 hidden md:table-cell whitespace-nowrap">
                          {format(new Date(tx.createdAt), 'MMM d, yyyy HH:mm')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <ActivityTimeline userId={userId} />
        </div>
      </div>

      <ConfirmDialog
        isOpen={confirmSuspend}
        title="Suspend this user?"
        description="They will lose access until an admin reactivates the account."
        confirmLabel="Suspend"
        tone="danger"
        loading={actionLoading || suspendUser.isPending}
        onCancel={() => setConfirmSuspend(false)}
        onConfirm={() => void handleSuspend()}
      />
    </div>
  );
}
