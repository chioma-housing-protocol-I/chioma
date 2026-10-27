/**
 * RBAC Module - Centralized exports for role-based access control
 */

// Enums and Constants
export { Permission, ROLE_PERMISSIONS } from './permissions.enum';

// Decorators
export { RequirePermissions } from './decorators/permissions.decorator';
export { PERMISSIONS_KEY } from './decorators/permissions.decorator';

// Guards
export { PermissionsGuard } from './guards/permissions.guard';

// Services
export { RbacService } from './services/rbac.service';

// Module
export { RbacModule } from './rbac.module';
