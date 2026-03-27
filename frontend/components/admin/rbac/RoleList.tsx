'use client';

import { useState, useMemo } from 'react';
import { Plus, RotateCcw, Search, Shield, Edit2, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  useAdminRoles,
  useDeleteRole,
  useCreateRole,
  useUpdateRole,
} from '@/lib/query/hooks/use-admin-roles';
import { useAdminUsers } from '@/lib/query/hooks/use-admin-users';
import { RoleForm } from './RoleForm';
import { PermissionMatrix } from './PermissionMatrix';
import type { Role } from '@/types';

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

export function RoleList() {
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [editingRole, setEditingRole] = useState<string | null>(null);

  const { data: roles = [], isLoading, refetch } = useAdminRoles();
  const { data: usersResponse } = useAdminUsers({ page: 1, limit: 100 });
  const deleteRoleMutation = useDeleteRole();
  const createRoleMutation = useCreateRole();
  const updateRoleMutation = useUpdateRole();

  const users = useMemo(() => usersResponse?.data ?? [], [usersResponse?.data]);

  const usersPerRole = useMemo(() => {
    return users.reduce<Record<string, number>>((acc, user) => {
      acc[user.role] = (acc[user.role] ?? 0) + 1;
      return acc;
    }, {});
  }, [users]);

  const filteredRoles = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return roles.filter(
      (role) =>
        normalizedSearch.length === 0 ||
        role.name.toLowerCase().includes(normalizedSearch) ||
        (role.description ?? '').toLowerCase().includes(normalizedSearch),
    );
  }, [search, roles]);

  const selectedRole = useMemo(
    () => roles.find((role) => role.id === selectedRoleId),
    [roles, selectedRoleId],
  );

  const handleRefresh = async () => {
    try {
      await refetch();
      toast.success('Roles refreshed');
    } catch {
      toast.error('Failed to refresh roles');
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    if (!confirm('Are you sure you want to delete this role?')) return;

    try {
      await deleteRoleMutation.mutateAsync(roleId);
      toast.success('Role deleted successfully');
      if (selectedRoleId === roleId) setSelectedRoleId(null);
      await refetch();
    } catch {
      toast.error('Failed to delete role');
    }
  };

  const handleRoleSubmit = async (data: {
    name: string;
    description?: string | null;
  }) => {
    try {
      if (editingRole) {
        await updateRoleMutation.mutateAsync({ id: editingRole, ...data });
        toast.success('Role updated successfully');
      } else {
        await createRoleMutation.mutateAsync(data);
        toast.success('Role created successfully');
      }
      await refetch();
      setShowForm(false);
      setEditingRole(null);
    } catch {
      toast.error(
        editingRole ? 'Failed to update role' : 'Failed to create role',
      );
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-white/5 text-blue-400 rounded-3xl flex items-center justify-center border border-white/10 shadow-lg">
            <Shield size={30} />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">
              Role Management
            </h1>
            <p className="text-blue-200/60 mt-1">
              Create, edit, and manage user roles.
            </p>
          </div>
        </div>
        <div className="flex gap-2 self-start sm:self-auto">
          <button
            onClick={() => {
              setEditingRole(null);
              setShowForm(!showForm);
            }}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold text-sm flex items-center gap-2 transition-all"
          >
            <Plus size={18} />
            New Role
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

      {showForm && (
        <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-6 border border-white/10">
          <RoleForm
            role={
              editingRole ? roles.find((r) => r.id === editingRole) : undefined
            }
            onSubmit={handleRoleSubmit}
            onCancel={() => {
              setShowForm(false);
              setEditingRole(null);
            }}
            isLoading={
              createRoleMutation.isPending || updateRoleMutation.isPending
            }
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-6 border border-white/10 space-y-4">
            <h2 className="text-lg font-bold text-white">Roles List</h2>

            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-300/40"
                size={16}
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search roles..."
                className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-blue-200/40 focus:outline-none focus:bg-white/10 focus:border-blue-500 transition-all"
              />
            </div>

            {isLoading ? (
              <div className="text-center py-4 text-blue-200/60">
                Loading roles...
              </div>
            ) : filteredRoles.length === 0 ? (
              <div className="text-center py-4 text-blue-200/60">
                {roles.length === 0 ? 'No roles yet' : 'No matching roles'}
              </div>
            ) : (
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {filteredRoles.map((role) => {
                  const userCount = usersPerRole[role.name] ?? 0;
                  const isSelected = selectedRoleId === role.id;

                  return (
                    <button
                      key={role.id}
                      onClick={() => setSelectedRoleId(role.id)}
                      className={`w-full text-left rounded-xl border p-3 transition-all text-sm ${
                        isSelected
                          ? 'bg-blue-500/10 border-blue-500/40'
                          : 'bg-white/5 border-white/10 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`text-xs font-semibold px-2 py-1 rounded-full border ${roleToneMap[role.name] === 'blue' ? 'text-blue-300 border-blue-400/30 bg-blue-500/10' : 'text-white/70 border-white/20'}`}
                        >
                          {prettify(role.name)}
                        </span>
                        <span className="text-xs text-blue-200/60">
                          {userCount} users
                        </span>
                      </div>
                      <p className="text-xs text-blue-100/70 mt-2 line-clamp-1">
                        {role.description || 'No description'}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2">
          {selectedRole ? (
            <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-6 border border-white/10 space-y-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-white">
                    {prettify(selectedRole.name)}
                  </h2>
                  <p className="text-blue-200/60 mt-1">
                    {selectedRole.description || 'No description provided'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setEditingRole(selectedRole.id);
                      setShowForm(true);
                    }}
                    className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white transition-all"
                    title="Edit"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    onClick={() => handleDeleteRole(selectedRole.id)}
                    className="p-2.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded-lg text-rose-400 transition-all"
                    title="Delete"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <p className="text-xs text-blue-200/60 uppercase tracking-wide">
                    Permissions
                  </p>
                  <p className="text-2xl font-bold text-white mt-1">
                    {selectedRole.permissions.length}
                  </p>
                </div>
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <p className="text-xs text-blue-200/60 uppercase tracking-wide">
                    Users
                  </p>
                  <p className="text-2xl font-bold text-white mt-1">
                    {usersPerRole[selectedRole.name] ?? 0}
                  </p>
                </div>
              </div>

              <div className="border-t border-white/10 pt-6">
                <h3 className="font-semibold text-white mb-4">
                  Assigned Permissions
                </h3>
                {selectedRole.permissions.length === 0 ? (
                  <p className="text-sm text-blue-200/60">
                    No permissions assigned
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {selectedRole.permissions.map((permission) => (
                      <div
                        key={permission.id}
                        className="text-xs bg-white/5 border border-white/10 rounded-lg p-2.5"
                      >
                        <p className="text-white font-medium">
                          {prettify(permission.action)}{' '}
                          {prettify(permission.resource)}
                        </p>
                        <p className="text-blue-200/60 mt-0.5">
                          {permission.description || permission.name}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-6 border border-white/10 flex items-center justify-center min-h-[400px]">
              <p className="text-blue-200/60">Select a role to view details</p>
            </div>
          )}
        </div>
      </div>

      {selectedRole && <PermissionMatrix roleId={selectedRole.id} />}
    </div>
  );
}

function prettify(value: string) {
  return value
    .replace(/_/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(' ');
}
