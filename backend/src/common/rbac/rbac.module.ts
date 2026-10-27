import { Module, Global } from '@nestjs/common';
import { RbacService } from './services/rbac.service';
import { PermissionsGuard } from './guards/permissions.guard';

/**
 * Global RBAC module providing role-based access control services
 */
@Global()
@Module({
  providers: [RbacService, PermissionsGuard],
  exports: [RbacService, PermissionsGuard],
})
export class RbacModule {}
