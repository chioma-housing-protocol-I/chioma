import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { UserRole } from '../../users/entities/user.entity';

@Injectable()
export class AdminGuard implements CanActivate {
  private readonly logger = new Logger(AdminGuard.name);

  canActivate(context: ExecutionContext): boolean {
    const { user } = context
      .switchToHttp()
      .getRequest<{ user?: { id?: string; role?: UserRole } }>();

    if (!user) {
      this.logger.warn('AdminGuard: No user found in request');
      throw new ForbiddenException('User not authenticated');
    }

    // Allow both ADMIN and SUPER_ADMIN roles
    const isAdmin =
      user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN;

    if (!isAdmin) {
      this.logger.warn(
        `AdminGuard: User ${user.id} (${user.role}) attempted to access admin resource`,
      );
      throw new ForbiddenException('Admin access required');
    }

    this.logger.debug(
      `AdminGuard: User ${user.id} (${user.role}) authorized for admin access`,
    );

    return true;
  }
}
