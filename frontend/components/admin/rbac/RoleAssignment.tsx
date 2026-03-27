'use client';

import { useState, useMemo } from 'react';
import { RotateCcw, Search, Filter, Users, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  useAdminRoles,
  useAssignUserRole,
} from '@/lib/query/hooks/use-admin-roles';
import { useAdminUsers } from '@/lib/query/hooks/use-admin-users';
import type { User } from '@/types';

type RoleBadgeTone = 'blue' | 'emerald' | 'amber' | 'rose' | 'slate';

const roleToneMap: Record<string, RoleBadgeTone> = {
  super_admin: 'rose',
  admin: 'blue',
  auditor: 'amber',
  support: 'emerald',
  landlord: 'emerald',
  tenant: 'amber',
  user: 'slate',
  agent: 'blue',
};

export function RoleAssignment() {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [bulkRole, setBulkRole] = useState('');
  const [pendingAssignments, setPendingAssignments] = useState<
    Record<string, string>
  >({});

  const { data: roles = [] } = useAdminRoles();
  const {
    data: usersResponse,
    isLoading,
    refetch,
  } = useAdminUsers({
    page: 1,
    limit: 500,
  });
  const assignRoleMutation = useAssignUserRole();

  const users = useMemo(() => usersResponse?.data ?? [], [usersResponse?.data]);

  const filteredUsers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return users.filter((user) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        user.email.toLowerCase().includes(normalizedSearch) ||
        (user.name ?? '').toLowerCase().includes(normalizedSearch);

      const matchesRole = !roleFilter || user.role === roleFilter;

      return matchesSearch && matchesRole;
    });
  }, [search, users, roleFilter]);

  const roleOptions = useMemo(
    () =>
      roles.map((role) => ({ value: role.name, label: prettify(role.name) })),
    [roles],
  );

  const selectedCount = selectedUsers.size;
  const handleRefresh = async () => {
    try {
      await refetch();
      toast.success('User data refreshed');
    } catch {
      toast.error('Failed to refresh user data');
    }
  };

  const toggleUser = (userId: string) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

  const toggleAllUsers = () => {
    if (selectedUsers.size === filteredUsers.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(filteredUsers.map((u) => u.id)));
    }
  };

  const setPendingUserRole = (userId: string, nextRole: string) => {
    setPendingAssignments((prev) => ({
      ...prev,
      [userId]: nextRole,
    }));
  };

  const handleAssignRole = async (user: User) => {
    const nextRole = pendingAssignments[user.id];
    if (!nextRole || nextRole === user.role) return;

    try {
      await assignRoleMutation.mutateAsync({
        userId: user.id,
        role: nextRole,
      });

      toast.success(`Assigned ${prettify(nextRole)} to ${user.email}`);
      setPendingAssignments((prev) => {
        const next = { ...prev };
        delete next[user.id];
        return next;
      });
      await refetch();
    } catch {
      toast.error(`Failed to assign role to ${user.email}`);
    }
  };

  const handleBulkAssign = async () => {
    if (!bulkRole || selectedUsers.size === 0) {
      toast.error('Select users and a role');
      return;
    }

    try {
      const selectedUsersList = Array.from(selectedUsers);
      await Promise.all(
        selectedUsersList.map((userId) =>
          assignRoleMutation.mutateAsync({
            userId,
            role: bulkRole,
          }),
        ),
      );

      toast.success(
        `Assigned ${prettify(bulkRole)} to ${selectedUsersList.length} users`,
      );
      setSelectedUsers(new Set());
      setBulkRole('');
      await refetch();
    } catch {
      toast.error('Failed to bulk assign roles');
    }
  };

  const exportData = () => {
    const data = filteredUsers.map((user) => ({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    }));

    const csv = [
      ['ID', 'Email', 'Name', 'Role'],
      ...data.map((row) => [row.id, row.email, row.name || '', row.role]),
    ]
      .map((row) => row.map((cell) => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `user-roles-${Date.now()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast.success('Data exported');
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-white/5 text-emerald-400 rounded-3xl flex items-center justify-center border border-white/10 shadow-lg">
            <Users size={30} />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">
              Role Assignments
            </h1>
            <p className="text-blue-200/60 mt-1">
              Assign and manage user roles.
            </p>
          </div>
        </div>
        <div className="flex gap-2 self-start sm:self-auto">
          <button
            onClick={exportData}
            className="p-3 bg-white/5 hover:bg-white/10 text-white rounded-2xl border border-white/10 transition-all"
            title="Export"
          >
            <Download size={20} />
          </button>
          <button
            onClick={handleRefresh}
            className="p-3 bg-white/5 hover:bg-white/10 text-white rounded-2xl border border-white/10 transition-all group"
            title="Refresh"
          >
            <RotateCcw
              size={20}
              className="group-hover:rotate-180 transition-transform duration-500"
            />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-6 border border-white/10">
          <p className="text-xs text-blue-200/60 uppercase tracking-wider">
            Total Users
          </p>
          <h3 className="text-2xl font-bold text-white mt-1">{users.length}</h3>
        </div>
        <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-6 border border-white/10">
          <p className="text-xs text-blue-200/60 uppercase tracking-wider">
            Total Roles
          </p>
          <h3 className="text-2xl font-bold text-white mt-1">{roles.length}</h3>
        </div>
        <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-6 border border-white/10">
          <p className="text-xs text-blue-200/60 uppercase tracking-wider">
            Selected
          </p>
          <h3 className="text-2xl font-bold text-white mt-1">
            {selectedCount}
          </h3>
        </div>
      </div>

      <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-6 border border-white/10 space-y-5">
        <h2 className="text-lg font-bold text-white">Bulk Operations</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              New Role
            </label>
            <select
              value={bulkRole}
              onChange={(e) => setBulkRole(e.target.value)}
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:bg-white/10 focus:border-blue-500 transition-all appearance-none"
            >
              <option value="">Select role...</option>
              {roleOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={handleBulkAssign}
          disabled={
            !bulkRole || selectedCount === 0 || assignRoleMutation.isPending
          }
          className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl font-semibold text-sm transition-colors"
        >
          {assignRoleMutation.isPending
            ? 'Assigning...'
            : `Assign to ${selectedCount} User${selectedCount !== 1 ? 's' : ''}`}
        </button>
      </div>

      <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-6 border border-white/10 space-y-5">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
          <div className="relative flex-1">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-300/40"
              size={18}
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email..."
              className="w-full pl-12 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:bg-white/10 focus:border-blue-500 transition-all"
            />
          </div>

          <div className="relative flex-1">
            <Filter
              className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-300/40"
              size={18}
            />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full pl-12 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:bg-white/10 focus:border-blue-500 transition-all appearance-none"
            >
              <option value="">All Roles</option>
              {roleOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-8 text-blue-200/60">
            Loading users...
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-8 text-blue-200/60">
            No users found
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full min-w-[1000px]">
              <thead className="bg-white/5">
                <tr className="text-left text-xs text-blue-200/70 uppercase tracking-wider">
                  <th className="px-4 py-3 w-8">
                    <input
                      type="checkbox"
                      checked={
                        selectedCount === filteredUsers.length &&
                        filteredUsers.length > 0
                      }
                      onChange={toggleAllUsers}
                      className="accent-blue-500"
                    />
                  </th>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Current Role</th>
                  <th className="px-4 py-3">New Role</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => {
                  const pendingRole = pendingAssignments[user.id] ?? user.role;
                  const changed = pendingRole !== user.role;
                  const tone = roleToneMap[user.role] ?? 'slate';
                  const isSelected = selectedUsers.has(user.id);

                  return (
                    <tr key={user.id} className="border-t border-white/10">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleUser(user.id)}
                          className="accent-blue-500"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-white font-medium">
                          {user.name || 'Unnamed User'}
                        </p>
                        <p className="text-xs text-blue-200/65">{user.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${roleBadgeClassName(tone)}`}
                        >
                          {prettify(user.role)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={pendingRole}
                          onChange={(e) =>
                            setPendingUserRole(user.id, e.target.value)
                          }
                          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:bg-white/10 focus:border-blue-500 appearance-none transition-all"
                        >
                          {roleOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleAssignRole(user)}
                          disabled={!changed || assignRoleMutation.isPending}
                          className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed text-white text-xs font-semibold transition-colors"
                        >
                          Save
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function roleBadgeClassName(tone: RoleBadgeTone) {
  const classes: Record<RoleBadgeTone, string> = {
    blue: 'text-blue-300 border-blue-400/30 bg-blue-500/10',
    emerald: 'text-emerald-300 border-emerald-400/30 bg-emerald-500/10',
    amber: 'text-amber-300 border-amber-400/30 bg-amber-500/10',
    rose: 'text-rose-300 border-rose-400/30 bg-rose-500/10',
    slate: 'text-slate-300 border-slate-400/30 bg-slate-500/10',
  };

  return classes[tone];
}

function prettify(value: string) {
  return value
    .replace(/_/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(' ');
}
