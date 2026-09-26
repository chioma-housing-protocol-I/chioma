'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { useDateFnsLocale } from '@/lib/utils/date-fns-locale';
import {
  ChevronLeft,
  ChevronRight,
  CheckSquare,
  Square,
  UserCheck,
  UserX,
  Download,
} from 'lucide-react';
import { UserAvatar } from '@/components/admin/users/UserAvatar';
import { SortableHeader } from '@/components/admin/SortableHeader';
import { BulkActionBar } from '@/components/admin/BulkActionBar';
import { BulkConfirmDialog } from '@/components/admin/BulkConfirmDialog';
import type { AdminUserSortField } from '@/lib/query/hooks/use-admin-users';
import type { User, PaginatedResponse } from '@/types';

interface BulkUserOperationsProps {
  users: PaginatedResponse<User> | undefined;
  isLoading: boolean;
  page: number;
  setPage: (page: number) => void;
  sortBy?: AdminUserSortField;
  sortOrder?: 'ASC' | 'DESC';
  onSort?: (key: AdminUserSortField) => void;
  onBulkSuspend: (ids: string[]) => Promise<void>;
  onBulkActivate: (ids: string[]) => Promise<void>;
  onBulkExport: (ids: string[]) => void;
  onRowClick?: (user: User) => void;
}

function getRoleBadge(role: User['role']): string {
  const colors: Record<User['role'], string> = {
    admin: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    user: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  };
  return colors[role] ?? 'bg-white/5 text-blue-300/40 border-white/10';
}

export const BulkUserOperations: React.FC<BulkUserOperationsProps> = ({
  users,
  isLoading,
  page,
  setPage,
  sortBy,
  sortOrder,
  onSort,
  onBulkSuspend,
  onBulkActivate,
  onBulkExport,
  onRowClick,
}) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirm, setConfirm] = useState<null | 'suspend' | 'activate'>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const dateFnsLocale = useDateFnsLocale();

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
        <BulkActionBar
          selectedCount={selectedCount}
          itemLabel="user"
          onClear={() => setSelectedIds(new Set())}
          actions={[
            {
              key: 'export',
              label: 'Export',
              icon: <Download size={14} />,
              onClick: () => onBulkExport(Array.from(selectedIds)),
            },
            {
              key: 'activate',
              label: 'Activate',
              icon: <UserCheck size={14} />,
              tone: 'success',
              onClick: () => setConfirm('activate'),
            },
            {
              key: 'suspend',
              label: 'Suspend',
              icon: <UserX size={14} />,
              tone: 'danger',
              onClick: () => setConfirm('suspend'),
            },
          ]}
        />

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
                  {onSort ? (
                    <SortableHeader
                      label="User"
                      sortKey="email"
                      currentSortBy={sortBy}
                      currentSortOrder={sortOrder}
                      onSort={onSort}
                      className="font-bold uppercase tracking-widest text-[10px]"
                    />
                  ) : (
                    <th className="px-6 py-4 font-bold uppercase tracking-widest text-[10px]">
                      User
                    </th>
                  )}
                  {onSort ? (
                    <SortableHeader
                      label="Role"
                      sortKey="role"
                      currentSortBy={sortBy}
                      currentSortOrder={sortOrder}
                      onSort={onSort}
                      className="font-bold uppercase tracking-widest text-[10px]"
                    />
                  ) : (
                    <th className="px-6 py-4 font-bold uppercase tracking-widest text-[10px]">
                      Role
                    </th>
                  )}
                  <th className="px-6 py-4 font-bold uppercase tracking-widest text-[10px]">
                    Status
                  </th>
                  {onSort ? (
                    <SortableHeader
                      label="Joined"
                      sortKey="createdAt"
                      currentSortBy={sortBy}
                      currentSortOrder={sortOrder}
                      onSort={onSort}
                      className="font-bold uppercase tracking-widest text-[10px]"
                    />
                  ) : (
                    <th className="px-6 py-4 font-bold uppercase tracking-widest text-[10px]">
                      Joined
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {data.map((user) => (
                  <tr
                    key={user.id}
                    className={`hover:bg-white/5 transition-colors ${selectedIds.has(user.id) ? 'bg-blue-500/5' : ''} ${onRowClick ? 'cursor-pointer' : ''}`}
                    onClick={onRowClick ? () => onRowClick(user) : undefined}
                  >
                    <td className="px-5 py-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleOne(user.id);
                        }}
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
                        <UserAvatar
                          name={user.name}
                          email={user.email}
                          src={user.avatar}
                        />
                        <div>
                          <Link
                            href={`/admin/users/${user.id}`}
                            className="text-white font-medium block hover:text-blue-400 transition-colors"
                          >
                            {user.name ?? 'Unknown'}
                          </Link>
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
                      {format(new Date(user.createdAt), 'MMM d, yyyy', {
                        locale: dateFnsLocale,
                      })}
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
        <BulkConfirmDialog
          title={`Suspend ${selectedCount} user${selectedCount !== 1 ? 's' : ''}?`}
          message="Suspended users will lose access to the platform. This action can be reversed by activating the users again."
          onConfirm={handleConfirm}
          onCancel={() => setConfirm(null)}
          isLoading={actionLoading}
          variant="danger"
        />
      )}
      {confirm === 'activate' && (
        <BulkConfirmDialog
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
