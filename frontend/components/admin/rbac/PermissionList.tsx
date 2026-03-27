'use client';

import { useState, useMemo } from 'react';
import { Plus, RotateCcw, Search, Lock, Edit2, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  useAdminPermissions,
  useDeletePermission,
  useCreatePermission,
  useUpdatePermission,
} from '@/lib/query/hooks/use-admin-roles';
import { useAdminRoles } from '@/lib/query/hooks/use-admin-roles';
import { PermissionForm } from './PermissionForm';
import type { Permission } from '@/types';

const resourceColors: Record<string, string> = {
  users: 'bg-blue-500/10 border-blue-500/30 text-blue-300',
  roles: 'bg-purple-500/10 border-purple-500/30 text-purple-300',
  permissions: 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300',
  audit: 'bg-amber-500/10 border-amber-500/30 text-amber-300',
  system: 'bg-rose-500/10 border-rose-500/30 text-rose-300',
};

export function PermissionList() {
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selectedPermId, setSelectedPermId] = useState<string | null>(null);
  const [editingPerm, setEditingPerm] = useState<string | null>(null);
  const [resourceFilter, setResourceFilter] = useState('');

  const { data: permissions = [], isLoading, refetch } = useAdminPermissions();
  const { data: roles = [] } = useAdminRoles();
  const deletePermMutation = useDeletePermission();
  const createPermMutation = useCreatePermission();
  const updatePermMutation = useUpdatePermission();

  const uniqueResources = useMemo(
    () => [...new Set(permissions.map((p) => p.resource))],
    [permissions],
  );

  const filteredPermissions = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return permissions.filter((perm) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        perm.name.toLowerCase().includes(normalizedSearch) ||
        perm.action.toLowerCase().includes(normalizedSearch) ||
        (perm.description ?? '').toLowerCase().includes(normalizedSearch);

      const matchesResource =
        !resourceFilter || perm.resource === resourceFilter;

      return matchesSearch && matchesResource;
    });
  }, [search, permissions, resourceFilter]);

  const selectedPermission = useMemo(
    () => permissions.find((p) => p.id === selectedPermId),
    [permissions, selectedPermId],
  );

  const rolesWithPerm = useMemo(() => {
    if (!selectedPermission) return [];
    return roles.filter((role) =>
      role.permissions.some((p) => p.id === selectedPermission.id),
    );
  }, [selectedPermission, roles]);

  const handleRefresh = async () => {
    try {
      await refetch();
      toast.success('Permissions refreshed');
    } catch {
      toast.error('Failed to refresh permissions');
    }
  };

  const handleDeletePermission = async (permId: string) => {
    if (!confirm('Are you sure you want to delete this permission?')) return;

    try {
      await deletePermMutation.mutateAsync(permId);
      toast.success('Permission deleted successfully');
      if (selectedPermId === permId) setSelectedPermId(null);
      await refetch();
    } catch {
      toast.error('Failed to delete permission');
    }
  };

  const handlePermissionSubmit = async (data: {
    name: string;
    action: string;
    resource: string;
    description?: string | null;
  }) => {
    try {
      if (editingPerm) {
        await updatePermMutation.mutateAsync({ id: editingPerm, ...data });
        toast.success('Permission updated successfully');
      } else {
        await createPermMutation.mutateAsync(data);
        toast.success('Permission created successfully');
      }
      await refetch();
      setShowForm(false);
      setEditingPerm(null);
    } catch {
      toast.error(
        editingPerm
          ? 'Failed to update permission'
          : 'Failed to create permission',
      );
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-white/5 text-indigo-400 rounded-3xl flex items-center justify-center border border-white/10 shadow-lg">
            <Lock size={30} />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">
              Permission Management
            </h1>
            <p className="text-blue-200/60 mt-1">
              Create and manage application permissions.
            </p>
          </div>
        </div>
        <div className="flex gap-2 self-start sm:self-auto">
          <button
            onClick={() => {
              setEditingPerm(null);
              setShowForm(!showForm);
            }}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold text-sm flex items-center gap-2 transition-all"
          >
            <Plus size={18} />
            New Permission
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
          <PermissionForm
            permission={
              editingPerm
                ? permissions.find((p) => p.id === editingPerm)
                : undefined
            }
            onSubmit={handlePermissionSubmit}
            onCancel={() => {
              setShowForm(false);
              setEditingPerm(null);
            }}
            isLoading={
              createPermMutation.isPending || updatePermMutation.isPending
            }
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-6 border border-white/10 space-y-4 sticky top-6">
            <h2 className="text-lg font-bold text-white">Permissions List</h2>

            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-300/40"
                size={16}
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search permissions..."
                className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-blue-200/40 focus:outline-none focus:bg-white/10 focus:border-blue-500 transition-all"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setResourceFilter('')}
                className={`text-xs px-3 py-1.5 rounded-xl border transition-all ${
                  resourceFilter === ''
                    ? 'bg-white/10 border-white/40 text-white'
                    : 'bg-white/5 border-white/10 text-blue-200/70 hover:border-white/20'
                }`}
              >
                All
              </button>
              {uniqueResources.map((resource) => (
                <button
                  key={resource}
                  onClick={() => setResourceFilter(resource)}
                  className={`text-xs px-3 py-1.5 rounded-xl border transition-all ${
                    resourceFilter === resource
                      ? 'bg-white/10 border-white/40 text-white'
                      : 'bg-white/5 border-white/10 text-blue-200/70 hover:border-white/20'
                  }`}
                >
                  {prettify(resource)}
                </button>
              ))}
            </div>

            {isLoading ? (
              <div className="text-center py-4 text-blue-200/60">
                Loading permissions...
              </div>
            ) : filteredPermissions.length === 0 ? (
              <div className="text-center py-4 text-blue-200/60">
                {permissions.length === 0
                  ? 'No permissions yet'
                  : 'No matching'}
              </div>
            ) : (
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {filteredPermissions.map((perm) => {
                  const isSelected = selectedPermId === perm.id;
                  const colorClass =
                    resourceColors[perm.resource] || resourceColors.system;

                  return (
                    <button
                      key={perm.id}
                      onClick={() => setSelectedPermId(perm.id)}
                      className={`w-full text-left rounded-xl border p-3 transition-all text-sm ${
                        isSelected
                          ? 'bg-blue-500/10 border-blue-500/40'
                          : 'bg-white/5 border-white/10 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <div
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold border whitespace-nowrap ${colorClass}`}
                        >
                          {prettify(perm.resource)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-white font-medium truncate">
                            {prettify(perm.action)}
                          </p>
                          <p className="text-xs text-blue-200/60">
                            {prettify(perm.name)}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2">
          {selectedPermission ? (
            <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-6 border border-white/10 space-y-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1.5 rounded-lg text-sm font-semibold border bg-indigo-500/10 border-indigo-500/30 text-indigo-300">
                      {prettify(selectedPermission.resource)}
                    </span>
                    <h2 className="text-2xl font-bold text-white">
                      {prettify(selectedPermission.action)}
                    </h2>
                  </div>
                  <p className="text-blue-200/60 mt-2">
                    {selectedPermission.description ||
                      'No description provided'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setEditingPerm(selectedPermission.id);
                      setShowForm(true);
                    }}
                    className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white transition-all"
                    title="Edit"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    onClick={() =>
                      handleDeletePermission(selectedPermission.id)
                    }
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
                    Permission Code
                  </p>
                  <p className="text-lg font-mono font-bold text-white mt-1">
                    {selectedPermission.name}
                  </p>
                </div>
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <p className="text-xs text-blue-200/60 uppercase tracking-wide">
                    Used in Roles
                  </p>
                  <p className="text-2xl font-bold text-white mt-1">
                    {rolesWithPerm.length}
                  </p>
                </div>
              </div>

              {rolesWithPerm.length > 0 && (
                <div className="border-t border-white/10 pt-6">
                  <h3 className="font-semibold text-white mb-4">
                    Roles with this Permission
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {rolesWithPerm.map((role) => (
                      <div
                        key={role.id}
                        className="text-xs bg-white/5 border border-white/10 rounded-lg p-2.5"
                      >
                        <p className="text-white font-medium">
                          {prettify(role.name)}
                        </p>
                        <p className="text-blue-200/60 mt-0.5">
                          {role.description || 'No description'}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-6 border border-white/10 flex items-center justify-center min-h-[400px]">
              <p className="text-blue-200/60">
                Select a permission to view details
              </p>
            </div>
          )}
        </div>
      </div>
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
