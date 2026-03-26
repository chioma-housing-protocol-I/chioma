'use client';

import React, { useState } from 'react';
import { format } from 'date-fns';
import {
  ChevronLeft,
  ChevronRight,
  CheckSquare,
  Square,
  UserCheck,
  UserX,
  Download,
  Loader2,
  AlertTriangle,
  X,
} from 'lucide-react';
import type { User, PaginatedResponse } from '@/types';

interface BulkUserOperationsProps {
  users: PaginatedResponse<User> | undefined;
  isLoading: boolean;
  page: number;
  setPage: (page: number) => void;
  onBulkSuspend: (ids: string[]) => Promise<void>;
  onBulkActivate: (ids: string[]) => Promise<void>;
  onBulkExport: (ids: string[]) => void;
}

interface ConfirmDialogProps {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading: boolean;
  variant: 'danger' | 'warning';
}

function ConfirmDialog({
  title,
  message,
  onConfirm,
  onCancel,
  isLoading,
  variant,
}: ConfirmDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
      />
      <div className="relative bg-slate-900 border border-white/10 rounded-3xl p-8 max-w-md w-full shadow-2xl space-y-6">
        <div className="flex items-start gap-4">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center border flex-shrink-0 ${variant === 'danger' ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-400'}`}
          >
            <AlertTriangle size={24} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">{title}</h3>
            <p className="text-blue-200/60 text-sm mt-1">{message}</p>
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="px-5 py-2.5 text-sm font-bold text-blue-200/60 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-all disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-5 py-2.5 text-sm font-bold text-white rounded-xl transition-all disabled:opacity-50 flex items-center gap-2 ${variant === 'danger' ? 'bg-rose-500 hover:bg-rose-600' : 'bg-amber-500 hover:bg-amber-600'}`}
          >
            {isLoading && <Loader2 size={16} className="animate-spin" />}
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

function getRoleBadge(role: User['role']): string {
  const colors: Record<User['role'], string> = {
    admin: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    landlord: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    tenant: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    agent: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  };
  return colors[role] ?? 'bg-white/5 text-blue-300/40 border-white/10';
}

export const BulkUserOperations: React.FC<BulkUserOperationsProps> = ({
  users,
  isLoading,
  page,
  setPage,
  onBulkSuspend,
  onBulkActivate,
  onBulkExport,
}) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirm, setConfirm] = useState<null | 'suspend' | 'activate'>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const data = users?.data ?? [];
  const totalPages = users?.totalPages ?? 1;
  const allSelected =
    data.length > 0 && data.every((u) => selectedIds.has(u.id));

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(data.map((u) => u.id)));
    }
  };

  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectedCount = selectedIds.size;

  const handleConfirm = async () => {
    if (!confirm) return;
    setActionLoading(true);
    try {
      const ids = Array.from(selectedIds);
      if (confirm === 'suspend') {
        await onBulkSuspend(ids);
      } else {
        await onBulkActivate(ids);
      }
      setSelectedIds(new Set());
    } finally {
      setActionLoading(false);
      setConfirm(null);
    }
  };

  if (isLoading) {
    return (
      <div className="h-64 flex items-center justify-center bg-white/5 rounded-3xl border border-white/10">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {/* Bulk action bar */}
        {selectedCount > 0 && (
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl px-5 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckSquare size={18} className="text-blue-400" />
              <span className="text-sm font-bold text-white">
                {selectedCount} user{selectedCount !== 1 ? 's' : ''} selected
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => onBulkExport(Array.from(selectedIds))}
                className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-blue-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-all"
              >
                <Download size={14} />
                Export
              </button>
              <button
                onClick={() => setConfirm('activate')}
                className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-emerald-300 hover:text-white bg-emerald-500/10 hover:bg-emerald-500/20 rounded-xl border border-emerald-500/20 transition-all"
              >
                <UserCheck size={14} />
                Activate
              </button>
              <button
                onClick={() => setConfirm('suspend')}
                className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-rose-300 hover:text-white bg-rose-500/10 hover:bg-rose-500/20 rounded-xl border border-rose-500/20 transition-all"
              >
                <UserX size={14} />
                Suspend
              </button>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="p-1.5 text-blue-300/60 hover:text-white hover:bg-white/5 rounded-lg transition-all"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="bg-white/5 backdrop-blur-sm rounded-3xl border border-white/10 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-white/5 text-blue-300/40">
                <tr>
                  <th className="px-5 py-4">
                    <button
                      onClick={toggleAll}
                      className="text-blue-300/40 hover:text-blue-400 transition-colors"
                      title={allSelected ? 'Deselect all' : 'Select all'}
                    >
                      {allSelected ? (
                        <CheckSquare size={18} className="text-blue-400" />
                      ) : (
                        <Square size={18} />
                      )}
                    </button>
                  </th>
                  <th className="px-6 py-4 font-bold uppercase tracking-widest text-[10px]">
                    User
                  </th>
                  <th className="px-6 py-4 font-bold uppercase tracking-widest text-[10px]">
                    Role
                  </th>
                  <th className="px-6 py-4 font-bold uppercase tracking-widest text-[10px]">
                    Status
                  </th>
                  <th className="px-6 py-4 font-bold uppercase tracking-widest text-[10px]">
                    Joined
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {data.map((user) => (
                  <tr
                    key={user.id}
                    className={`hover:bg-white/5 transition-colors ${selectedIds.has(user.id) ? 'bg-blue-500/5' : ''}`}
                  >
                    <td className="px-5 py-4">
                      <button
                        onClick={() => toggleOne(user.id)}
                        className="text-blue-300/40 hover:text-blue-400 transition-colors"
                      >
                        {selectedIds.has(user.id) ? (
                          <CheckSquare size={18} className="text-blue-400" />
                        ) : (
                          <Square size={18} />
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-sm font-bold text-white uppercase flex-shrink-0">
                          {(user.name ?? user.email).charAt(0)}
                        </div>
                        <div>
                          <span className="text-white font-medium block">
                            {user.name ?? 'Unknown'}
                          </span>
                          <span className="text-[10px] text-blue-300/40 font-mono">
                            {user.email}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getRoleBadge(user.role)}`}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${user.isVerified ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}
                      >
                        {user.isVerified ? 'Verified' : 'Pending'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-blue-200/60">
                      {format(new Date(user.createdAt), 'MMM d, yyyy')}
                    </td>
                  </tr>
                ))}
                {data.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-12 text-center text-blue-200/40"
                    >
                      No users found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-2">
          <p className="text-xs text-blue-300/40">
            Page <span className="text-white font-bold">{page}</span> of{' '}
            <span className="text-white font-bold">{totalPages}</span>
            {users?.total !== undefined && (
              <span>
                {' '}
                - <span className="text-white font-bold">
                  {users.total}
                </span>{' '}
                total
              </span>
            )}
          </p>
          <div className="flex items-center gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
              className="p-2 text-blue-400 hover:text-white hover:bg-white/5 border border-white/10 rounded-xl disabled:opacity-30 disabled:pointer-events-none transition-all"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              className="p-2 text-blue-400 hover:text-white hover:bg-white/5 border border-white/10 rounded-xl disabled:opacity-30 disabled:pointer-events-none transition-all"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation dialogs */}
      {confirm === 'suspend' && (
        <ConfirmDialog
          title={`Suspend ${selectedCount} user${selectedCount !== 1 ? 's' : ''}?`}
          message="Suspended users will lose access to the platform. This action can be reversed by activating the users again."
          onConfirm={handleConfirm}
          onCancel={() => setConfirm(null)}
          isLoading={actionLoading}
          variant="danger"
        />
      )}
      {confirm === 'activate' && (
        <ConfirmDialog
          title={`Activate ${selectedCount} user${selectedCount !== 1 ? 's' : ''}?`}
          message="Activated users will regain access to the platform."
          onConfirm={handleConfirm}
          onCancel={() => setConfirm(null)}
          isLoading={actionLoading}
          variant="warning"
        />
      )}
    </>
  );
};
