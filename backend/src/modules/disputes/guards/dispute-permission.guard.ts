import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../../users/entities/user.entity';
import { DISPUTE_PERMISSION_KEY } from '../decorators/dispute-permission.decorator';

@Injectable()
export class DisputePermissionGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermission = this.reflector.get<string>(
      DISPUTE_PERMISSION_KEY,
      context.getHandler(),
    );

    if (!requiredPermission) {
      return true; // No specific permission required
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const disputeId = request.params.disputeId || request.params.id;

    if (!user || !disputeId) {
      throw new ForbiddenException('Authentication required');
    }

    // This would typically involve checking the dispute in the database
    // For now, we'll implement basic role-based checks
    return this.checkPermission(user, requiredPermission);
  }

  private checkPermission(user: any, permission: string): boolean {
    switch (permission) {
      case 'create_dispute':
        // Users can create disputes, admins can create any
        return user.role === UserRole.USER || user.role === UserRole.ADMIN;

      case 'view_dispute':
        // All authenticated users can view disputes they're party to
        return user.role === UserRole.USER || user.role === UserRole.ADMIN;

      case 'manage_dispute':
        // Only admins can manage disputes
        return user.role === UserRole.ADMIN;

      case 'add_evidence':
        // Users can add evidence to disputes they're party to
        return user.role === UserRole.USER || user.role === UserRole.ADMIN;

      case 'add_comment':
        // Users can add comments to disputes they're party to
        return user.role === UserRole.USER || user.role === UserRole.ADMIN;

      default:
        return false;
    }
  }
}
