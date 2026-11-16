import { SetMetadata } from '@nestjs/common';
import { Permission } from '../permissions.enum';

export const PERMISSIONS_KEY = 'permissions';

/**
 * Decorator to require specific permissions for a route
 * Usage: @RequirePermissions(Permission.USER_CREATE, Permission.USER_UPDATE)
 */
export const RequirePermissions = (...permissions: Permission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
