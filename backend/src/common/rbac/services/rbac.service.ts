import { Injectable, Logger } from '@nestjs/common';
import { Permission, ROLE_PERMISSIONS } from '../permissions.enum';
import { UserRole } from '../../../modules/users/entities/user.entity';

/**
 * Service for checking permissions and role capabilities
 */
@Injectable()
export class RbacService {
  private readonly logger = new Logger(RbacService.name);

  /**
   * Check if a role has a specific permission
   */
  hasPermission(role: UserRole, permission: Permission): boolean {
    const permissions = ROLE_PERMISSIONS[role] || [];
    return permissions.includes(permission);
  }

  /**
   * Check if a role has all of the specified permissions
   */
  hasAllPermissions(role: UserRole, permissions: Permission[]): boolean {
    return permissions.every((permission) =>
      this.hasPermission(role, permission),
    );
  }

  /**
   * Check if a role has any of the specified permissions
   */
  hasAnyPermission(role: UserRole, permissions: Permission[]): boolean {
    return permissions.some((permission) =>
      this.hasPermission(role, permission),
    );
  }

  /**
   * Get all permissions for a role
   */
  getPermissionsForRole(role: UserRole): Permission[] {
    return ROLE_PERMISSIONS[role] || [];
  }

  /**
   * Check if a user can perform an action on a resource
   * Supports ownership checks
   */
  canAccess(
    userRole: UserRole,
    userId: string,
    permission: Permission,
    resourceOwnerId?: string,
  ): boolean {
    // Check if user has the required permission
    if (!this.hasPermission(userRole, permission)) {
      this.logger.debug(
        `User ${userId} (${userRole}) lacks permission: ${permission}`,
      );
      return false;
    }

    // If resourceOwnerId is provided and matches userId, allow access
    // This enables users to manage their own resources
    if (resourceOwnerId && resourceOwnerId === userId) {
      this.logger.debug(
        `User ${userId} accessing own resource (ownership check passed)`,
      );
      return true;
    }

    // For admin and super_admin, allow access to all resources
    if (
      userRole === UserRole.ADMIN ||
      userRole === UserRole.SUPER_ADMIN
    ) {
      return true;
    }

    // For non-admin users, only allow access to own resources
    if (resourceOwnerId && resourceOwnerId !== userId) {
      this.logger.debug(
        `User ${userId} (${userRole}) denied access to resource owned by ${resourceOwnerId}`,
      );
      return false;
    }

    return true;
  }

  /**
   * Get role hierarchy level (higher number = more privileges)
   */
  getRoleLevel(role: UserRole): number {
    const roleLevels: Record<UserRole, number> = {
      [UserRole.USER]: 1,
      [UserRole.AGENT]: 2,
      [UserRole.ADMIN]: 3,
      [UserRole.SUPER_ADMIN]: 4,
    };

    return roleLevels[role] || 0;
  }

  /**
   * Check if one role has higher privileges than another
   */
  isHigherRole(role1: UserRole, role2: UserRole): boolean {
    return this.getRoleLevel(role1) > this.getRoleLevel(role2);
  }

  /**
   * Check if a role can manage another role
   * (e.g., admin can manage users but not super_admins)
   */
  canManageRole(managerRole: UserRole, targetRole: UserRole): boolean {
    // Super admin can manage all roles
    if (managerRole === UserRole.SUPER_ADMIN) {
      return true;
    }

    // Admin can manage user and agent roles, but not admin or super_admin
    if (managerRole === UserRole.ADMIN) {
      return (
        targetRole === UserRole.USER || targetRole === UserRole.AGENT
      );
    }

    // Other roles cannot manage roles
    return false;
  }

  /**
   * Get all available roles
   */
  getAllRoles(): UserRole[] {
    return Object.values(UserRole);
  }

  /**
   * Get all available permissions
   */
  getAllPermissions(): Permission[] {
    return Object.values(Permission);
  }

  /**
   * Get permissions diff between two roles
   */
  getPermissionsDiff(
    fromRole: UserRole,
    toRole: UserRole,
  ): { added: Permission[]; removed: Permission[] } {
    const fromPermissions = this.getPermissionsForRole(fromRole);
    const toPermissions = this.getPermissionsForRole(toRole);

    const added = toPermissions.filter(
      (p) => !fromPermissions.includes(p),
    );
    const removed = fromPermissions.filter(
      (p) => !toPermissions.includes(p),
    );

    return { added, removed };
  }
}
