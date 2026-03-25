import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RbacService } from '../rbac.service';
import {
  PermissionAction,
  PermissionResource,
} from '../entities/permission.entity';

export const PERMISSIONS_KEY = 'required_permissions';

export interface RequiredPermission {
  resource: PermissionResource;
  action: PermissionAction;
}

export const RequirePermission = (
  resource: PermissionResource,
  action: PermissionAction,
) => Reflect.metadata(PERMISSIONS_KEY, [{ resource, action }]);

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private rbacService: RbacService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<RequiredPermission[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!required || required.length === 0) {
      return true;
    }

    const { user } = context
      .switchToHttp()
      .getRequest<{ user?: { role?: string } }>();

    if (!user?.role) {
      throw new ForbiddenException('User not authenticated');
    }

    const allGranted = required.every(({ resource, action }) =>
      this.rbacService.hasPermission(user.role!, resource, action),
    );

    if (!allGranted) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
