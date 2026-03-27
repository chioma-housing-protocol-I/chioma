'use client';

import { useMemo, useState } from 'react';
import { Check } from 'lucide-react';
import {
  useAdminRoles,
  useAdminPermissions,
  useUpdateRolePermissions,
} from '@/lib/query/hooks/use-admin-roles';
import toast from 'react-hot-toast';

interface PermissionMatrixProps {
  roleId: string;
}

export function PermissionMatrix({ roleId }: PermissionMatrixProps) {
  const { data: roles = [] } = useAdminRoles();
  const { data: permissions = [] } = useAdminPermissions();
  const [editedPermissions, setEditedPermissions] = useState<
    Record<string, boolean>
  >({});
  const [hasChanges, setHasChanges] = useState(false);

  const updatePermissionsMutation = useUpdateRolePermissions();

  const selectedRole = useMemo(
    () => roles.find((r) => r.id === roleId),
    [roles, roleId],
  );

  const groupedPermissions = useMemo(() => {
    return permissions.reduce<Record<string, typeof permissions>>(
      (acc, perm) => {
        const resource = perm.resource;
        acc[resource] = acc[resource] ? [...acc[resource], perm] : [perm];
        return acc;
      },
      {},
    );
  }, [permissions]);

  const sortedResources = useMemo(
    () => Object.keys(groupedPermissions).sort(),
    [groupedPermissions],
  );

  const currentPermissions = useMemo(() => {
    if (hasChanges) {
      return Object.entries(editedPermissions)
        .filter(([, isChecked]) => isChecked)
        .map(([permId]) => permId);
    }

    if (!selectedRole) return [];
    return selectedRole.permissions.map((p) => p.id);
  }, [hasChanges, editedPermissions, selectedRole]);

  const handleTogglePermission = (permissionId: string) => {
    setEditedPermissions((prev) => ({
      ...prev,
      [permissionId]: !prev[permissionId],
    }));
    setHasChanges(true);
  };

  const handleSaveMatrix = async () => {
    if (!selectedRole) return;

    try {
      await updatePermissionsMutation.mutateAsync({
        roleId: selectedRole.id,
        permissionIds: currentPermissions,
      });

      toast.success('Permissions updated successfully');
      setHasChanges(false);
      setEditedPermissions({});
    } catch {
      toast.error('Failed to update permissions');
    }
  };

  if (!selectedRole || sortedResources.length === 0) {
    return null;
  }

  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-6 border border-white/10 space-y-5">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-bold text-white">
          Permission Matrix - {prettify(selectedRole.name)}
        </h2>
        {hasChanges && (
          <button
            onClick={handleSaveMatrix}
            disabled={updatePermissionsMutation.isPending}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl font-semibold text-sm transition-colors"
          >
            {updatePermissionsMutation.isPending ? 'Saving...' : 'Save Changes'}
          </button>
        )}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full min-w-[800px]">
          <thead className="bg-white/5">
            <tr>
              <th className="px-6 py-3 text-left text-xs text-blue-200/70 uppercase tracking-wider font-semibold">
                Permission
              </th>
              <th className="px-6 py-3 text-center text-xs text-blue-200/70 uppercase tracking-wider font-semibold">
                Assigned
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedResources.map((resource) => {
              const resourcePermissions = groupedPermissions[resource];

              return (
                <tbody key={resource}>
                  <tr className="border-t border-white/10 bg-white/5">
                    <td
                      colSpan={2}
                      className="px-6 py-3 text-sm font-semibold text-blue-300 uppercase tracking-wide"
                    >
                      {prettify(resource)}
                    </td>
                  </tr>
                  {resourcePermissions.map((permission) => {
                    const isChecked = currentPermissions.includes(
                      permission.id,
                    );

                    return (
                      <tr
                        key={permission.id}
                        className="border-t border-white/10 hover:bg-white/5 transition-colors"
                      >
                        <td className="px-6 py-3">
                          <div>
                            <p className="text-sm text-white font-medium">
                              {prettify(permission.action)} {prettify(resource)}
                            </p>
                            <p className="text-xs text-blue-200/60 mt-0.5">
                              {permission.description || permission.name}
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-3 text-center">
                          <button
                            onClick={() =>
                              handleTogglePermission(permission.id)
                            }
                            className={`inline-flex items-center justify-center w-6 h-6 rounded-lg border transition-all ${
                              isChecked
                                ? 'bg-blue-600 border-blue-500 text-white'
                                : 'bg-white/5 border-white/10 hover:border-white/20'
                            }`}
                          >
                            {isChecked && <Check size={16} />}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="bg-white/5 rounded-2xl p-4 border border-white/10 flex items-center justify-between">
        <div>
          <p className="text-sm text-white font-medium">
            {currentPermissions.length} of {permissions.length} permissions
            assigned
          </p>
          <p className="text-xs text-blue-200/60 mt-1">
            {Math.round((currentPermissions.length / permissions.length) * 100)}
            % coverage
          </p>
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
