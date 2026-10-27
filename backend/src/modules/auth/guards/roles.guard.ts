import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../../users/entities/user.entity';

export const ROLES_KEY = 'roles';

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context
      .switchToHttp()
      .getRequest<{ user?: { id?: string; role?: UserRole } }>();

    if (!user) {
      this.logger.warn('RolesGuard: No user found in request');
      throw new ForbiddenException('User not authenticated');
    }

    if (!user.role) {
      this.logger.warn(`RolesGuard: User ${user.id} has no role assigned`);
      throw new ForbiddenException('User has no role assigned');
    }

    const hasRole = requiredRoles.some((role) => user.role === role);

    if (!hasRole) {
      this.logger.warn(
        `RolesGuard: User ${user.id} (${user.role}) lacks required roles: ${requiredRoles.join(', ')}`,
      );
      throw new ForbiddenException(
        `Insufficient permissions. Required roles: ${requiredRoles.join(', ')}`,
      );
    }

    this.logger.debug(
      `RolesGuard: User ${user.id} (${user.role}) authorized with roles: ${requiredRoles.join(', ')}`,
    );

    return true;
  }
}
