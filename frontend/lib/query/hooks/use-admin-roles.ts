'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { queryKeys } from '../keys';
import type { Permission, Role } from '@/types';

type AssignRolePayload = {
  userId: string;
  role: string;
};

type UpdateRolePermissionsPayload = {
  roleId: string;
  permissionIds: string[];
};

export function useAdminRoles() {
  return useQuery({
    queryKey: queryKeys.roles.list(),
    queryFn: async () => {
      const { data } = await apiClient.get<Role[]>(
        '/api/v1/security/rbac/roles',
      );
      return data;
    },
  });
}

export function useAdminPermissions() {
  return useQuery({
    queryKey: queryKeys.roles.permissions(),
    queryFn: async () => {
      const { data } = await apiClient.get<Permission[]>(
        '/api/v1/security/rbac/permissions',
      );
      return data;
    },
  });
}

export function useAssignUserRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, role }: AssignRolePayload) => {
      await apiClient.patch(`/admin/users/${userId}/role`, { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.roles.all });
    },
  });
}

export function useUpdateRolePermissions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      roleId,
      permissionIds,
    }: UpdateRolePermissionsPayload) => {
      await apiClient.patch(`/api/v1/security/rbac/roles/${roleId}`, {
        permissionIds,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.roles.all });
    },
  });
}

export function useCreateRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { name: string; description?: string | null }) => {
      const { data: role } = await apiClient.post<Role>(
        '/api/v1/security/rbac/roles',
        data,
      );
      return role;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.roles.all });
    },
  });
}

export function useUpdateRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      name,
      description,
    }: {
      id: string;
      name: string;
      description?: string | null;
    }) => {
      const { data: role } = await apiClient.patch<Role>(
        `/api/v1/security/rbac/roles/${id}`,
        { name, description },
      );
      return role;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.roles.all });
    },
  });
}

export function useDeleteRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (roleId: string) => {
      await apiClient.delete(`/api/v1/security/rbac/roles/${roleId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.roles.all });
    },
  });
}

export function useCreatePermission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      name: string;
      action: string;
      resource: string;
      description?: string | null;
    }) => {
      const { data: permission } = await apiClient.post<Permission>(
        '/api/v1/security/rbac/permissions',
        data,
      );
      return permission;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.roles.permissions(),
      });
    },
  });
}

export function useUpdatePermission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      name,
      action,
      resource,
      description,
    }: {
      id: string;
      name: string;
      action: string;
      resource: string;
      description?: string | null;
    }) => {
      const { data: permission } = await apiClient.patch<Permission>(
        `/api/v1/security/rbac/permissions/${id}`,
        { name, action, resource, description },
      );
      return permission;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.roles.permissions(),
      });
    },
  });
}

export function useDeletePermission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (permissionId: string) => {
      await apiClient.delete(
        `/api/v1/security/rbac/permissions/${permissionId}`,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.roles.permissions(),
      });
    },
  });
}
