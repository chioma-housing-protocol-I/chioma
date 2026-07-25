'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Award,
  CheckCircle2,
  Eye,
  RefreshCw,
  Star,
  Trash2,
  Plus,
  X,
  Link as LinkIcon,
  Unlink,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { useAuth } from '@/store/authStore';
import {
  useAdminArbiters,
  useRegisterArbiter,
  useDeregisterArbiter,
  useArbiterReputation,
  useLinkUserToArbiter,
  useUnlinkUserFromArbiter,
  type AdminArbiterRecord,
  type RegisterArbiterPayload,
} from '@/lib/query/hooks/use-admin-arbiters';
import { UserManagementModal } from '@/components/admin/arbiters/UserManagementModal';
import type { User } from '@/types';

export default function AdminArbitersPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<AdminArbiterRecord | null>(null);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [registerForm, setRegisterForm] = useState<RegisterArbiterPayload>({
    arbiterAddress: '',
    qualifications: '',
    stakeAmount: '',
    specialization: '',
  });

  useEffect(() => {
    if (!authLoading && user?.role !== 'admin') {
      router.replace('/');
    }
  }, [authLoading, user?.role, router]);

  const arbitersQuery = useAdminArbiters();
  const registerMutation = useRegisterArbiter();
  const deregisterMutation = useDeregisterArbiter();
  const linkUserMutation = useLinkUserToArbiter();
  const unlinkUserMutation = useUnlinkUserFromArbiter();
  const reputationQuery = useArbiterReputation(selected?.stellarAddress || '');

  const arbiters = useMemo(
    () => arbitersQuery.data ?? [],
    [arbitersQuery.data],
  );

  const filteredArbiters = useMemo(() => {
    if (!search) return arbiters;
    return arbiters.filter(
      (a) =>
        a.stellarAddress.toLowerCase().includes(search.toLowerCase()) ||
        a.metadata?.qualifications
          ?.toLowerCase()
          .includes(search.toLowerCase()),
    );
  }, [arbiters, search]);

  const metrics = useMemo(() => {
    return arbiters.reduce(
      (acc, arbiter) => {
        acc.total += 1;
        if (arbiter.active) acc.active += 1;
        acc.totalVotes += arbiter.totalVotes;
        acc.avgReputation +=
          arbiter.reputationScore / Math.max(arbiters.length, 1);
        return acc;
      },
      { total: 0, active: 0, totalVotes: 0, avgReputation: 0 },
    );
  }, [arbiters]);

  const handleRegister = async () => {
    if (
      !registerForm.arbiterAddress ||
      !registerForm.qualifications ||
      !registerForm.stakeAmount
    ) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const result = await registerMutation.mutateAsync(registerForm);
      toast.success(`Arbiter registered: ${result.transactionHash}`);
      setShowRegisterModal(false);
      setRegisterForm({
        arbiterAddress: '',
        qualifications: '',
        stakeAmount: '',
        specialization: '',
      });
    } catch (error) {
      toast.error('Failed to register arbiter');
    }
  };

  const handleDeregister = async (address: string) => {
    if (!confirm(`Deregister arbiter ${address}?`)) return;

    try {
      await deregisterMutation.mutateAsync({ arbiterAddress: address });
      toast.success('Arbiter deregistered successfully');
      setSelected(null);
    } catch (error) {
      toast.error('Failed to deregister arbiter');
    }
  };

  const handleLinkUser = async (user: User) => {
    if (!selected) return;

    try {
      await linkUserMutation.mutateAsync({
        arbiterAddress: selected.stellarAddress,
        userId: user.id,
      });
      setSelected({
        ...selected,
        userId: parseInt(user.id),
        user,
      });
      toast.success(`Linked arbiter to ${user.email}`);
    } catch (error) {
      toast.error('Failed to link user to arbiter');
      throw error;
    }
  };

  const handleUnlinkUser = async () => {
    if (!selected) return;

    if (!confirm('Unlink user from this arbiter?')) return;

    try {
      await unlinkUserMutation.mutateAsync(selected.stellarAddress);
      setSelected({
        ...selected,
        userId: null,
        user: null,
      });
      toast.success('User unlinked from arbiter');
    } catch (error) {
      toast.error('Failed to unlink user from arbiter');
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh] text-blue-200/80">
        Loading...
      </div>
    );
  }

  if (user?.role !== 'admin') return null;

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-3xl border border-white/10 bg-white/5 text-amber-300">
            <Award className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">
              Arbiters Management
            </h1>
            <p className="text-sm text-blue-200/60">
              Manage dispute arbiters and their reputation scores.
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => void arbitersQuery.refetch()}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-white hover:bg-white/10"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
          <button
            onClick={() => setShowRegisterModal(true)}
            className="flex items-center gap-2 rounded-xl bg-amber-500/20 border border-amber-500/30 px-4 py-2 text-amber-300 hover:bg-amber-500/30"
          >
            <Plus className="h-4 w-4" />
            Register Arbiter
          </button>
        </div>
      </header>

      {/* Metrics */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <MetricCard
          label="Total Arbiters"
          value={metrics.total}
          icon={<Award />}
        />
        <MetricCard
          label="Active"
          value={metrics.active}
          icon={<CheckCircle2 />}
        />
        <MetricCard
          label="Total Votes"
          value={metrics.totalVotes}
          icon={<Star />}
        />
        <MetricCard
          label="Avg Reputation"
          value={metrics.avgReputation.toFixed(2)}
          icon={<Award />}
        />
      </div>

      {/* Search */}
      <div className="flex gap-3">
        <input
          placeholder="Search by address or qualifications..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 rounded-xl bg-slate-900 px-3 py-2 text-white placeholder-blue-200/40"
        />
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-white/10 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-white/5">
              <th className="p-4 text-left text-white font-semibold">
                Address
              </th>
              <th className="p-4 text-left text-white font-semibold">Status</th>
              <th className="p-4 text-left text-white font-semibold">
                Reputation
              </th>
              <th className="p-4 text-left text-white font-semibold">Votes</th>
              <th className="p-4 text-left text-white font-semibold">
                Resolved
              </th>
              <th className="p-4 text-right text-white font-semibold">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredArbiters.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-4 text-center text-blue-200/60">
                  No arbiters found
                </td>
              </tr>
            ) : (
              filteredArbiters.map((arbiter) => (
                <tr
                  key={arbiter.id}
                  className="border-b border-white/5 hover:bg-white/5 transition-colors"
                >
                  <td className="p-4 text-white font-mono text-xs">
                    {arbiter.stellarAddress.substring(0, 16)}...
                  </td>
                  <td className="p-4">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${
                        arbiter.active
                          ? 'bg-green-500/20 text-green-300'
                          : 'bg-red-500/20 text-red-300'
                      }`}
                    >
                      <div
                        className={`w-2 h-2 rounded-full ${
                          arbiter.active ? 'bg-green-400' : 'bg-red-400'
                        }`}
                      />
                      {arbiter.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 text-amber-400" />
                      <span className="text-white">
                        {arbiter.reputationScore.toFixed(2)}
                      </span>
                    </div>
                  </td>
                  <td className="p-4 text-white">{arbiter.totalVotes}</td>
                  <td className="p-4 text-white">
                    {arbiter.totalDisputesResolved}
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setSelected(arbiter)}
                        className="p-2 rounded-lg bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 transition-colors"
                        title="View details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      {arbiter.active && (
                        <button
                          onClick={() =>
                            handleDeregister(arbiter.stellarAddress)
                          }
                          disabled={deregisterMutation.isPending}
                          className="p-2 rounded-lg bg-red-500/20 text-red-300 hover:bg-red-500/30 transition-colors disabled:opacity-50"
                          title="Deregister"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Detail Panel */}
      {selected && (
        <div className="p-6 border border-white/10 rounded-2xl bg-white/5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-white mb-2">
                Arbiter Details
              </h2>
              <p className="text-sm text-blue-200/60 font-mono">
                {selected.stellarAddress}
              </p>
            </div>
            <button
              onClick={() => setSelected(null)}
              className="p-2 rounded-lg hover:bg-white/10"
            >
              <X className="h-5 w-5 text-white" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-blue-200/60 uppercase tracking-wide">
                Status
              </p>
              <p className="text-white font-semibold mt-1">
                {selected.active ? 'Active' : 'Inactive'}
              </p>
            </div>

            <div>
              <p className="text-xs text-blue-200/60 uppercase tracking-wide">
                Reputation Score
              </p>
              <p className="text-white font-semibold mt-1">
                {selected.reputationScore.toFixed(2)}
              </p>
            </div>

            <div>
              <p className="text-xs text-blue-200/60 uppercase tracking-wide">
                Total Votes
              </p>
              <p className="text-white font-semibold mt-1">
                {selected.totalVotes}
              </p>
            </div>

            <div>
              <p className="text-xs text-blue-200/60 uppercase tracking-wide">
                Disputes Resolved
              </p>
              <p className="text-white font-semibold mt-1">
                {selected.totalDisputesResolved}
              </p>
            </div>

            <div>
              <p className="text-xs text-blue-200/60 uppercase tracking-wide">
                Successful Resolutions
              </p>
              <p className="text-white font-semibold mt-1">
                {selected.successfulResolutions}
              </p>
            </div>

            {selected.metadata?.qualifications && (
              <div>
                <p className="text-xs text-blue-200/60 uppercase tracking-wide">
                  Qualifications
                </p>
                <p className="text-white font-semibold mt-1">
                  {selected.metadata.qualifications}
                </p>
              </div>
            )}

            {selected.metadata?.specialization && (
              <div>
                <p className="text-xs text-blue-200/60 uppercase tracking-wide">
                  Specialization
                </p>
                <p className="text-white font-semibold mt-1">
                  {selected.metadata.specialization}
                </p>
              </div>
            )}

            <div>
              <p className="text-xs text-blue-200/60 uppercase tracking-wide">
                Joined
              </p>
              <p className="text-white font-semibold mt-1">
                {new Date(selected.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* User Association Section */}
          <div className="mt-6 p-4 bg-white/5 rounded-xl border border-white/10">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white">
                Associated User
              </h3>
              {selected.user && (
                <button
                  onClick={handleUnlinkUser}
                  disabled={unlinkUserMutation.isPending}
                  className="p-1.5 rounded-lg bg-red-500/20 text-red-300 hover:bg-red-500/30 transition-colors disabled:opacity-50"
                  title="Unlink user"
                >
                  <Unlink className="h-4 w-4" />
                </button>
              )}
            </div>

            {selected.user ? (
              <div className="space-y-2">
                <div>
                  <p className="text-xs text-blue-200/60">Name</p>
                  <p className="text-white font-medium">
                    {selected.user.name || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-blue-200/60">Email</p>
                  <p className="text-white font-medium">
                    {selected.user.email}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-blue-200/60">Role</p>
                  <p className="text-white font-medium">{selected.user.role}</p>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowUserModal(true)}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-blue-500/20 border border-blue-500/30 text-blue-300 hover:bg-blue-500/30 transition-colors"
              >
                <LinkIcon className="h-4 w-4" />
                Link User
              </button>
            )}
          </div>

          {reputationQuery.data && (
            <div className="mt-6 p-4 bg-white/5 rounded-xl border border-white/10">
              <h3 className="text-sm font-semibold text-white mb-3">
                Reputation Details
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-blue-200/60">Score</p>
                  <p className="text-white font-semibold">
                    {reputationQuery.data.reputationScore.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-blue-200/60">Total Votes</p>
                  <p className="text-white font-semibold">
                    {reputationQuery.data.totalVotes}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Register Modal */}
      {showRegisterModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-2xl border border-white/10 p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">Register Arbiter</h2>
              <button
                onClick={() => setShowRegisterModal(false)}
                className="p-2 hover:bg-white/10 rounded-lg"
              >
                <X className="h-5 w-5 text-white" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-blue-200/80 mb-2">
                  Stellar Address *
                </label>
                <input
                  type="text"
                  placeholder="G..."
                  value={registerForm.arbiterAddress}
                  onChange={(e) =>
                    setRegisterForm({
                      ...registerForm,
                      arbiterAddress: e.target.value,
                    })
                  }
                  className="w-full rounded-lg bg-slate-800 border border-white/10 px-3 py-2 text-white placeholder-blue-200/40 focus:outline-none focus:border-amber-500/50"
                />
              </div>

              <div>
                <label className="block text-sm text-blue-200/80 mb-2">
                  Qualifications *
                </label>
                <textarea
                  placeholder="Enter arbiter qualifications..."
                  value={registerForm.qualifications}
                  onChange={(e) =>
                    setRegisterForm({
                      ...registerForm,
                      qualifications: e.target.value,
                    })
                  }
                  className="w-full rounded-lg bg-slate-800 border border-white/10 px-3 py-2 text-white placeholder-blue-200/40 focus:outline-none focus:border-amber-500/50 resize-none h-24"
                />
              </div>

              <div>
                <label className="block text-sm text-blue-200/80 mb-2">
                  Stake Amount *
                </label>
                <input
                  type="text"
                  placeholder="0.00"
                  value={registerForm.stakeAmount}
                  onChange={(e) =>
                    setRegisterForm({
                      ...registerForm,
                      stakeAmount: e.target.value,
                    })
                  }
                  className="w-full rounded-lg bg-slate-800 border border-white/10 px-3 py-2 text-white placeholder-blue-200/40 focus:outline-none focus:border-amber-500/50"
                />
              </div>

              <div>
                <label className="block text-sm text-blue-200/80 mb-2">
                  Specialization
                </label>
                <input
                  type="text"
                  placeholder="e.g., Property Disputes"
                  value={registerForm.specialization}
                  onChange={(e) =>
                    setRegisterForm({
                      ...registerForm,
                      specialization: e.target.value,
                    })
                  }
                  className="w-full rounded-lg bg-slate-800 border border-white/10 px-3 py-2 text-white placeholder-blue-200/40 focus:outline-none focus:border-amber-500/50"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowRegisterModal(false)}
                  className="flex-1 rounded-lg border border-white/10 px-4 py-2 text-white hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRegister}
                  disabled={registerMutation.isPending}
                  className="flex-1 rounded-lg bg-amber-500/20 border border-amber-500/30 px-4 py-2 text-amber-300 hover:bg-amber-500/30 disabled:opacity-50"
                >
                  {registerMutation.isPending ? 'Registering...' : 'Register'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* User Management Modal */}
      {selected && (
        <UserManagementModal
          isOpen={showUserModal}
          onClose={() => setShowUserModal(false)}
          arbiterAddress={selected.stellarAddress}
          currentUserId={selected.userId}
          onUserSelected={handleLinkUser}
          isLoading={linkUserMutation.isPending}
        />
      )}
    </section>
  );
}

function MetricCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
}) {
  return (
    <div className="p-4 rounded-xl bg-white/5 border border-white/10">
      <div className="flex items-center gap-2 mb-2 text-amber-300">{icon}</div>
      <p className="text-xs text-blue-200/60 uppercase tracking-wide">
        {label}
      </p>
      <h3 className="text-2xl font-bold text-white mt-1">{value}</h3>
    </div>
  );
}
