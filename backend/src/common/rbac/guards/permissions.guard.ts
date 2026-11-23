import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Permission } from '../permissions.enum';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { UserRole } from '../../../modules/users/entities/user.entity';
import { KycStatus } from '../../../modules/kyc/kyc-status.enum';
import { RbacService } from '../services/rbac.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
  private readonly logger = new Logger(PermissionsGuard.name);

  constructor(
    private reflector: Reflector,
    private readonly rbacService: RbacService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    // Get required permissions from decorator
    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no permissions required, allow access
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      this.logger.warn('PermissionsGuard: No user found in request');
      throw new ForbiddenException('User not authenticated');
    }

    if (!user.role) {
      this.logger.warn(
        `PermissionsGuard: User ${user.id} has no role assigned`,
      );
      throw new ForbiddenException('User has no role assigned');
    }

    // Get user's permissions based on their role and KYC state. A user
    // queued for manual review keeps read/resubmit rights only.
    const userPermissions = this.getUserPermissions(
      user.role,
      user.kycStatus as KycStatus | undefined,
    );

    // Check if user has all required permissions
    const hasAllPermissions = requiredPermissions.every((permission) =>
      userPermissions.includes(permission),
    );

    if (!hasAllPermissions) {
      const missingPermissions = requiredPermissions.filter(
        (permission) => !userPermissions.includes(permission),
      );

      this.logger.warn(
        `PermissionsGuard: User ${user.id} (${user.role}) lacks permissions: ${missingPermissions.join(', ')}`,
      );

      throw new ForbiddenException(
        `Insufficient permissions. Required: ${requiredPermissions.join(', ')}`,
      );
    }

    this.logger.debug(
      `PermissionsGuard: User ${user.id} (${user.role}) authorized for permissions: ${requiredPermissions.join(', ')}`,
    );

    return true;
  }

  /**
   * Get all permissions for a given role
   */
  private getUserPermissions(
    role: UserRole,
    kycStatus?: KycStatus,
  ): Permission[] {
    const permissions = this.rbacService.getPermissionsForRole(role, kycStatus);

    if (permissions.length === 0) {
      this.logger.warn(`No permissions defined for role: ${role}`);
    }

    return permissions;
  }
}
