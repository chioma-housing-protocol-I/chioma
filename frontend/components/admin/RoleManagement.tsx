'use client';

import { useMemo, useState, type ReactNode } from 'react';
import {
  Check,
  Filter,
  RotateCcw,
  Search,
  Shield,
  ShieldCheck,
  Users,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  useAdminPermissions,
  useAdminRoles,
  useAssignUserRole,
  useUpdateRolePermissions,
} from '@/lib/query/hooks/use-admin-roles';
import { useAdminUsers } from '@/lib/query/hooks/use-admin-users';
import type { Permission, User } from '@/types';

const USER_FETCH_LIMIT = 100;

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

export function RoleManagement() {
  const [search, setSearch] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('all');
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [editedPermissionIds, setEditedPermissionIds] = useState<
    string[] | null
  >(null);
  const [pendingAssignments, setPendingAssignments] = useState<
    Record<string, string>
  >({});

  const {
    data: roles = [],
    isLoading: isRolesLoading,
    refetch: refetchRoles,
  } = useAdminRoles();
  const {
    data: allPermissions = [],
    isLoading: isPermissionsLoading,
    refetch: refetchPermissions,
  } = useAdminPermissions();
  const {
    data: usersResponse,
    isLoading: isUsersLoading,
    refetch: refetchUsers,
  } = useAdminUsers({ page: 1, limit: USER_FETCH_LIMIT });

  const assignRoleMutation = useAssignUserRole();
  const updateRolePermissionsMutation = useUpdateRolePermissions();

  const users = useMemo(() => usersResponse?.data ?? [], [usersResponse?.data]);

  const roleOptions = useMemo(
    () =>
      roles.map((role) => ({ value: role.name, label: prettify(role.name) })),
    [roles],
  );

  const usersPerRole = useMemo(() => {
    return users.reduce<Record<string, number>>((acc, user) => {
      acc[user.role] = (acc[user.role] ?? 0) + 1;
      return acc;
    }, {});
  }, [users]);

  const filteredUsers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return users.filter((user) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        user.email.toLowerCase().includes(normalizedSearch) ||
        (user.name ?? '').toLowerCase().includes(normalizedSearch);

      const matchesRole =
        selectedRoleFilter === 'all' || user.role === selectedRoleFilter;

      return matchesSearch && matchesRole;
    });
  }, [search, selectedRoleFilter, users]);

  const selectedRole = useMemo(() => {
    if (roles.length === 0) return null;
    if (!selectedRoleId) return roles[0];
    return roles.find((role) => role.id === selectedRoleId) ?? roles[0];
  }, [roles, selectedRoleId]);

  const hasExplicitSelectedRole = useMemo(
    () => !!selectedRoleId && roles.some((role) => role.id === selectedRoleId),
    [roles, selectedRoleId],
  );

  const effectiveEditedPermissionIds = useMemo(() => {
    if (!selectedRole) return [];
    if (!hasExplicitSelectedRole || editedPermissionIds === null) {
      return selectedRole.permissions.map((permission) => permission.id);
    }
    return editedPermissionIds;
  }, [editedPermissionIds, hasExplicitSelectedRole, selectedRole]);

  const selectedPermissionSet = useMemo(
    () => new Set(effectiveEditedPermissionIds),
    [effectiveEditedPermissionIds],
  );

  const displayedPermissions = useMemo(() => {
    if (!selectedRole) return [];

    if (allPermissions.length > 0) {
      return allPermissions;
    }

    return selectedRole.permissions;
  }, [allPermissions, selectedRole]);

  const groupedPermissions = useMemo(() => {
    return displayedPermissions.reduce<Record<string, Permission[]>>(
      (acc, permission) => {
        const key = permission.resource;
        acc[key] = acc[key] ? [...acc[key], permission] : [permission];
        return acc;
      },
      {},
    );
  }, [displayedPermissions]);

  const isLoading = isRolesLoading || isPermissionsLoading || isUsersLoading;

  const handleRefresh = async () => {
    try {
      await Promise.all([refetchRoles(), refetchPermissions(), refetchUsers()]);
      toast.success('Role management data refreshed');
    } catch {
      toast.error('Failed to refresh role management data');
    }
  };

  const handleRoleSelection = (roleId: string) => {
    const role = roles.find((item) => item.id === roleId);
    if (!role) return;
    setSelectedRoleId(role.id);
    setEditedPermissionIds(role.permissions.map((permission) => permission.id));
  };

  const togglePermission = (permissionId: string) => {
    if (!selectedRole) return;

    setEditedPermissionIds((prev) => {
      const current =
        prev ?? selectedRole.permissions.map((permission) => permission.id);

      return current.includes(permissionId)
        ? current.filter((id) => id !== permissionId)
        : [...current, permissionId];
    });
  };

  const handleSaveRolePermissions = async () => {
    if (!selectedRole) return;

    try {
      await updateRolePermissionsMutation.mutateAsync({
        roleId: selectedRole.id,
        permissionIds: effectiveEditedPermissionIds,
      });

      toast.success(`${prettify(selectedRole.name)} permissions updated`);
    } catch {
      toast.error('Unable to save permissions right now');
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

      toast.success(`Assigned ${prettify(nextRole)} role to ${user.email}`);
      setPendingAssignments((prev) => {
        const next = { ...prev };
        delete next[user.id];
        return next;
      });
    } catch {
      toast.error(`Unable to update role for ${user.email}`);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-white/5 text-blue-400 rounded-3xl flex items-center justify-center border border-white/10 shadow-lg">
            <ShieldCheck size={30} />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">
              Role Management
            </h1>
            <p className="text-blue-200/60 mt-1">
              Assign roles, review permissions, and update access policies.
            </p>
          </div>
        </div>
        <button
          onClick={handleRefresh}
          className="p-3 bg-white/5 hover:bg-white/10 text-white rounded-2xl border border-white/10 transition-all group self-start sm:self-auto"
          title="Refresh"
        >
          <RotateCcw
            size={20}
            className="group-hover:rotate-180 transition-transform duration-500"
          />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        <StatCard
          title="Available Roles"
          value={roles.length}
          icon={<Shield size={22} />}
          color="blue"
        />
        <StatCard
          title="Total Permissions"
          value={allPermissions.length}
          icon={<Check size={22} />}
          color="emerald"
        />
        <StatCard
          title="Users Loaded"
          value={users.length}
          icon={<Users size={22} />}
          color="amber"
        />
      </div>

      <section className="bg-white/5 backdrop-blur-sm rounded-3xl p-6 border border-white/10 space-y-5">
        <h2 className="text-lg font-bold text-white">Available Roles</h2>
        {isLoading ? (
          <EmptyState message="Loading roles..." />
        ) : roles.length === 0 ? (
          <EmptyState message="No roles available yet." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {roles.map((role) => {
              const tone = roleToneMap[role.name] ?? 'slate';
              const userCount = usersPerRole[role.name] ?? 0;

              return (
                <button
                  key={role.id}
                  onClick={() => handleRoleSelection(role.id)}
                  className={`text-left rounded-2xl border p-4 transition-all ${
                    selectedRole?.id === role.id
                      ? 'bg-blue-500/10 border-blue-500/40'
                      : 'bg-white/5 border-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className={roleBadgeClassName(tone)}>
                      {prettify(role.name)}
                    </span>
                    <span className="text-xs text-blue-200/70">
                      {userCount} users
                    </span>
                  </div>
                  <p className="text-sm text-blue-100/80 mt-3 line-clamp-2">
                    {role.description ||
                      'No description provided for this role.'}
                  </p>
                  <p className="text-xs text-blue-200/60 mt-3">
                    {role.permissions.length} assigned permissions
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </section>

      <section className="bg-white/5 backdrop-blur-sm rounded-3xl p-6 border border-white/10 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-white">
            Edit Role Permissions
          </h2>
          <button
            onClick={handleSaveRolePermissions}
            disabled={!selectedRole || updateRolePermissionsMutation.isPending}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors"
          >
            {updateRolePermissionsMutation.isPending
              ? 'Saving...'
              : 'Save Changes'}
          </button>
        </div>

        {!selectedRole ? (
          <EmptyState message="Select a role to edit permissions." />
        ) : (
          <>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
              <h3 className="text-sm font-semibold text-white">
                {prettify(selectedRole.name)} Permissions
              </h3>
              <p className="text-xs text-blue-200/70 mt-1">
                Toggle permissions to adjust what this role can access.
              </p>
            </div>

            <div className="space-y-4">
              {Object.entries(groupedPermissions).map(
                ([resource, permissions]) => (
                  <div
                    key={resource}
                    className="rounded-2xl border border-white/10 bg-white/5 p-4"
                  >
                    <h4 className="text-sm font-semibold text-blue-200 mb-3 uppercase tracking-wide">
                      {prettify(resource)}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                      {permissions.map((permission) => {
                        const checked = selectedPermissionSet.has(
                          permission.id,
                        );

                        return (
                          <label
                            key={permission.id}
                            className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-3 cursor-pointer hover:border-white/20 transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => togglePermission(permission.id)}
                              className="mt-1 accent-blue-500"
                            />
                            <span>
                              <span className="block text-sm text-white font-medium">
                                {prettify(permission.action)}{' '}
                                {prettify(permission.resource)}
                              </span>
                              <span className="block text-xs text-blue-200/65 mt-0.5">
                                {permission.description || permission.name}
                              </span>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ),
              )}
            </div>
          </>
        )}
      </section>

      <section className="bg-white/5 backdrop-blur-sm rounded-3xl p-6 border border-white/10 space-y-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-white">
            Assign Roles to Users
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative group">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-300/40 group-focus-within:text-blue-400 transition-colors"
              size={18}
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search users by name or email..."
              className="w-full pl-12 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:bg-white/10 focus:border-blue-500 transition-all"
            />
          </div>
          <div className="relative group">
            <Filter
              className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-300/40"
              size={18}
            />
            <select
              value={selectedRoleFilter}
              onChange={(e) => setSelectedRoleFilter(e.target.value)}
              className="w-full pl-12 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:bg-white/10 focus:border-blue-500 appearance-none transition-all"
            >
              <option value="all" className="bg-slate-900">
                All Roles
              </option>
              {roleOptions.map((option) => (
                <option
                  key={option.value}
                  value={option.value}
                  className="bg-slate-900"
                >
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {isUsersLoading ? (
          <EmptyState message="Loading users..." />
        ) : filteredUsers.length === 0 ? (
          <EmptyState message="No users match your filters." />
        ) : (
          <div className="overflow-auto rounded-2xl border border-white/10">
            <table className="w-full min-w-[760px]">
              <thead className="bg-white/5">
                <tr className="text-left text-xs text-blue-200/70 uppercase tracking-wider">
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

                  return (
                    <tr key={user.id} className="border-t border-white/10">
                      <td className="px-4 py-3">
                        <p className="text-sm text-white font-medium">
                          {user.name || 'Unnamed User'}
                        </p>
                        <p className="text-xs text-blue-200/65">{user.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={roleBadgeClassName(tone)}>
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
                            <option
                              key={option.value}
                              value={option.value}
                              className="bg-slate-900"
                            >
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
                          Save Role
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/20 bg-white/5 p-6 text-sm text-blue-200/70">
      {message}
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: string | number;
  icon: ReactNode;
  color: 'blue' | 'emerald' | 'amber';
}) {
  const colorMap: Record<string, string> = {
    blue: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    amber: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  };

  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-6 border border-white/10 flex items-center gap-4">
      <div
        className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${colorMap[color]}`}
      >
        {icon}
      </div>
      <div>
        <p className="text-xs text-blue-200/60 uppercase tracking-wider">
          {title}
        </p>
        <h3 className="text-2xl font-bold text-white">{value}</h3>
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

  return `inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${classes[tone]}`;
}

function prettify(value: string) {
  return value
    .replace(/_/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(' ');
}
