import { Injectable, Logger } from '@nestjs/common';
import { Permission, ROLE_PERMISSIONS } from '../permissions.enum';
import { UserRole } from '../../../modules/users/entities/user.entity';
import { KycStatus } from '../../../modules/kyc/kyc-status.enum';

/**
 * Rights that are suspended while a user's KYC verification is queued for
 * manual review. Read access and the ability to resubmit documents remain so
 * the user can resolve the queue without contacting support.
 */
export const MANUAL_REVIEW_RESTRICTED_PERMISSIONS: Permission[] = [
  Permission.PAYMENT_CREATE,
  Permission.PAYMENT_PROCESS,
  Permission.PAYMENT_REFUND,
  Permission.PAYMENT_READ_ALL,
  Permission.AGREEMENT_CREATE,
  Permission.AGREEMENT_SIGN,
  Permission.AGREEMENT_TERMINATE,
  Permission.PROPERTY_CREATE,
  Permission.PROPERTY_PUBLISH,
  Permission.PROPERTY_APPROVE,
  Permission.DISPUTE_CREATE,
  Permission.STELLAR_TRANSACTION,
  Permission.STELLAR_ESCROW,
  Permission.STELLAR_ADMIN,
  Permission.ANALYTICS_EXPORT,
  Permission.REPORT_GENERATE,
];

/** Pure helper shared by RbacService and PermissionsGuard. */
export function restrictPermissionsForKycStatus(
  permissions: Permission[],
  kycStatus?: KycStatus,
): Permission[] {
  if (kycStatus !== KycStatus.MANUAL_REVIEW) {
    return permissions;
  }
  return permissions.filter(
    (permission) => !MANUAL_REVIEW_RESTRICTED_PERMISSIONS.includes(permission),
  );
}

/**
 * Service for checking permissions and role capabilities
 */
@Injectable()
export class RbacService {
  private readonly logger = new Logger(RbacService.name);

  /**
   * Check if a role has a specific permission
   */
  hasPermission(
    role: UserRole,
    permission: Permission,
    kycStatus?: KycStatus,
  ): boolean {
    const permissions = restrictPermissionsForKycStatus(
      ROLE_PERMISSIONS[role] || [],
      kycStatus,
    );
    return permissions.includes(permission);
  }

  /**
   * Check if a role has all of the specified permissions
   */
  hasAllPermissions(
    role: UserRole,
    permissions: Permission[],
    kycStatus?: KycStatus,
  ): boolean {
    return permissions.every((permission) =>
      this.hasPermission(role, permission, kycStatus),
    );
  }

  /**
   * Check if a role has any of the specified permissions
   */
  hasAnyPermission(
    role: UserRole,
    permissions: Permission[],
    kycStatus?: KycStatus,
  ): boolean {
    return permissions.some((permission) =>
      this.hasPermission(role, permission, kycStatus),
    );
  }

  /**
   * Get all permissions for a role
   */
  getPermissionsForRole(role: UserRole, kycStatus?: KycStatus): Permission[] {
    return restrictPermissionsForKycStatus(
      ROLE_PERMISSIONS[role] || [],
      kycStatus,
    );
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
    kycStatus?: KycStatus,
  ): boolean {
    // Check if user has the required permission
    if (!this.hasPermission(userRole, permission, kycStatus)) {
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
    if (userRole === UserRole.ADMIN || userRole === UserRole.SUPER_ADMIN) {
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
      return targetRole === UserRole.USER || targetRole === UserRole.AGENT;
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

    const added = toPermissions.filter((p) => !fromPermissions.includes(p));
    const removed = fromPermissions.filter((p) => !toPermissions.includes(p));

    return { added, removed };
  }
}
