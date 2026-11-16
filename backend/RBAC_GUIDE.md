# Role-Based Access Control (RBAC) Guide

## Overview

Chioma implements a comprehensive Role-Based Access Control (RBAC) system that provides fine-grained permission management across the platform. The system supports both role-based and permission-based access control.

## Table of Contents

1. [Architecture](#architecture)
2. [Roles](#roles)
3. [Permissions](#permissions)
4. [Usage](#usage)
5. [Guards](#guards)
6. [Best Practices](#best-practices)
7. [Examples](#examples)

## Architecture

The RBAC system consists of:

- **Roles**: Predefined user roles (USER, AGENT, ADMIN, SUPER_ADMIN)
- **Permissions**: Granular permissions for specific actions on resources
- **Guards**: NestJS guards that enforce access control
- **Decorators**: Easy-to-use decorators for protecting routes
- **Service**: RbacService for programmatic permission checks

```
┌─────────────────┐
│     User        │
└────────┬────────┘
         │ has
         ▼
┌─────────────────┐
│      Role       │
└────────┬────────┘
         │ grants
         ▼
┌─────────────────┐
│  Permissions    │
└────────┬────────┘
         │ allow
         ▼
┌─────────────────┐
│   Resources     │
└─────────────────┘
```

## Roles

### Role Hierarchy

1. **USER** (Level 1)
   - Basic authenticated users
   - Can manage their own resources
   - Limited access to system features

2. **AGENT** (Level 2)
   - Property agents/managers
   - Can manage properties and agreements
   - Extended user capabilities

3. **ADMIN** (Level 3)
   - System administrators
   - Can manage users, properties, disputes
   - Access to analytics and reports

4. **SUPER_ADMIN** (Level 4)
   - Full system access
   - Can manage system configuration
   - Can manage all roles including admins

### Role Definitions

```typescript
export enum UserRole {
  USER = 'user',
  AGENT = 'agent',
  ADMIN = 'admin',
  SUPER_ADMIN = 'super_admin',
}
```

## Permissions

Permissions follow the pattern: `RESOURCE_ACTION`

### Permission Categories

#### User Management
- `user:read` - View user information
- `user:create` - Create new users
- `user:update` - Update user information
- `user:delete` - Delete users
- `user:manage_roles` - Assign roles to users
- `user:read_all` - View all users in the system

#### Property Management
- `property:read` - View properties
- `property:create` - Create properties
- `property:update` - Update properties
- `property:delete` - Delete properties
- `property:publish` - Publish properties
- `property:approve` - Approve property listings

#### Agreement Management
- `agreement:read` - View agreements
- `agreement:create` - Create agreements
- `agreement:update` - Update agreements
- `agreement:delete` - Delete agreements
- `agreement:sign` - Sign agreements
- `agreement:terminate` - Terminate agreements

#### Payment Management
- `payment:read` - View payments
- `payment:create` - Create payments
- `payment:process` - Process payments
- `payment:refund` - Issue refunds
- `payment:read_all` - View all payments

#### Dispute Management
- `dispute:read` - View disputes
- `dispute:create` - Create disputes
- `dispute:resolve` - Resolve disputes
- `dispute:escalate` - Escalate disputes
- `dispute:read_all` - View all disputes

#### System Administration
- `system:config` - Modify system configuration
- `system:audit_log` - Access audit logs
- `system:manage_roles` - Manage role definitions
- `system:manage_permissions` - Manage permission definitions
- `system:backup` - Create system backups
- `system:restore` - Restore from backups

[See full permission list in `src/common/rbac/permissions.enum.ts`]

## Usage

### Protecting Routes with Roles

Use the `@Roles()` decorator to require specific roles:

```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminController {
  @Get('dashboard')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  getDashboard() {
    return { message: 'Admin dashboard' };
  }
}
```

### Protecting Routes with Permissions

Use the `@RequirePermissions()` decorator for fine-grained control:

```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/rbac/guards/permissions.guard';
import { RequirePermissions } from '../../common/rbac/decorators/permissions.decorator';
import { Permission } from '../../common/rbac/permissions.enum';

@Controller('users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UsersController {
  @Get()
  @RequirePermissions(Permission.USER_READ_ALL)
  getAllUsers() {
    return { message: 'List all users' };
  }

  @Post()
  @RequirePermissions(Permission.USER_CREATE)
  createUser() {
    return { message: 'Create user' };
  }
}
```

### Using RbacService

For programmatic permission checks in services:

```typescript
import { Injectable } from '@nestjs/common';
import { RbacService } from '../../common/rbac/services/rbac.service';
import { Permission } from '../../common/rbac/permissions.enum';
import { UserRole } from '../users/entities/user.entity';

@Injectable()
export class PropertyService {
  constructor(private rbacService: RbacService) {}

  async deleteProperty(propertyId: string, userId: string, userRole: UserRole) {
    const property = await this.findProperty(propertyId);

    // Check if user has permission and owns the resource
    if (!this.rbacService.canAccess(
      userRole,
      userId,
      Permission.PROPERTY_DELETE,
      property.ownerId
    )) {
      throw new ForbiddenException('Cannot delete this property');
    }

    // Proceed with deletion
    return this.propertyRepository.delete(propertyId);
  }
}
```

## Guards

### Available Guards

1. **RolesGuard** (`src/modules/auth/guards/roles.guard.ts`)
   - Checks user roles
   - Used with `@Roles()` decorator
   - Supports multiple roles (OR logic)

2. **PermissionsGuard** (`src/common/rbac/guards/permissions.guard.ts`)
   - Checks fine-grained permissions
   - Used with `@RequirePermissions()` decorator
   - Supports multiple permissions (AND logic)

3. **AdminGuard** (`src/modules/auth/guards/admin.guard.ts`)
   - Shortcut for admin access
   - Allows ADMIN and SUPER_ADMIN roles

### Guard Order

Always apply guards in this order:

```typescript
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
```

1. **JwtAuthGuard** - Authenticates user and attaches to request
2. **RolesGuard** - Checks role requirements
3. **PermissionsGuard** - Checks permission requirements

## Best Practices

### 1. Principle of Least Privilege

Grant the minimum permissions necessary:

```typescript
// ❌ Bad - Too broad
@Roles(UserRole.ADMIN)
getUser() { }

// ✅ Good - Specific permission
@RequirePermissions(Permission.USER_READ)
getUser() { }
```

### 2. Resource Ownership

Always check resource ownership:

```typescript
async updateProperty(id: string, updateDto: UpdatePropertyDto, user: User) {
  const property = await this.findProperty(id);
  
  // Check ownership or admin role
  if (property.ownerId !== user.id && user.role !== UserRole.ADMIN) {
    throw new ForbiddenException();
  }
  
  return this.propertyRepository.update(id, updateDto);
}
```

### 3. Combine Guards When Needed

```typescript
@Get('sensitive-data')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles(UserRole.ADMIN)
@RequirePermissions(Permission.SYSTEM_AUDIT_LOG)
getSensitiveData() {
  // Requires both ADMIN role AND audit log permission
}
```

### 4. Document Role Changes

When modifying role permissions, update:
1. `ROLE_PERMISSIONS` mapping
2. API documentation
3. Frontend permission checks
4. Integration tests

### 5. Test Permission Boundaries

```typescript
describe('PropertyController', () => {
  it('should deny property deletion to non-owners', async () => {
    const response = await request(app.getHttpServer())
      .delete('/properties/123')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(403);
  });

  it('should allow property deletion to owners', async () => {
    const response = await request(app.getHttpServer())
      .delete('/properties/123')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);
  });
});
```

## Examples

### Example 1: Public Endpoint

```typescript
@Controller('properties')
export class PropertiesController {
  @Get()
  // No guards - public access
  listProperties() {
    return this.propertyService.findAll();
  }
}
```

### Example 2: Authenticated User

```typescript
@Controller('profile')
@UseGuards(JwtAuthGuard)
export class ProfileController {
  @Get()
  // Only requires authentication
  getProfile(@CurrentUser() user: User) {
    return this.profileService.getProfile(user.id);
  }
}
```

### Example 3: Role-Based Access

```typescript
@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportsController {
  @Get('analytics')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  getAnalytics() {
    return this.reportsService.getAnalytics();
  }
}
```

### Example 4: Permission-Based Access

```typescript
@Controller('disputes')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DisputesController {
  @Post(':id/resolve')
  @RequirePermissions(Permission.DISPUTE_RESOLVE)
  resolveDispute(@Param('id') id: string) {
    return this.disputeService.resolve(id);
  }
}
```

### Example 5: Complex Access Control

```typescript
@Controller('users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UsersController {
  constructor(private rbacService: RbacService) {}

  @Patch(':id/role')
  @RequirePermissions(Permission.USER_MANAGE_ROLES)
  async updateUserRole(
    @Param('id') targetUserId: string,
    @Body() dto: UpdateRoleDto,
    @CurrentUser() currentUser: User,
  ) {
    const targetUser = await this.usersService.findOne(targetUserId);

    // Additional check: cannot modify role of higher-level users
    if (!this.rbacService.canManageRole(currentUser.role, targetUser.role)) {
      throw new ForbiddenException('Cannot modify role of this user');
    }

    return this.usersService.updateRole(targetUserId, dto.role);
  }
}
```

## Migration Guide

### Upgrading Existing Controllers

1. **Identify protected routes**
2. **Determine required permissions**
3. **Add appropriate decorators**
4. **Test access control**

Example migration:

```typescript
// Before
@Controller('properties')
export class PropertiesController {
  @Delete(':id')
  deleteProperty(@Param('id') id: string) {
    return this.propertyService.delete(id);
  }
}

// After
@Controller('properties')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PropertiesController {
  @Delete(':id')
  @RequirePermissions(Permission.PROPERTY_DELETE)
  deleteProperty(@Param('id') id: string, @CurrentUser() user: User) {
    return this.propertyService.delete(id, user);
  }
}
```

## Troubleshooting

### Common Issues

1. **"User not authenticated" error**
   - Ensure JwtAuthGuard is applied before other guards
   - Check JWT token is valid and not expired

2. **"Insufficient permissions" error**
   - Verify user has required role/permission
   - Check ROLE_PERMISSIONS mapping is correct

3. **Guards not being applied**
   - Ensure guards are in correct order
   - Check guard is registered in module providers

### Debug Logging

Enable debug logging for RBAC:

```bash
LOG_LEVEL=debug npm run start:dev
```

Look for logs from:
- `RolesGuard`
- `PermissionsGuard`
- `RbacService`

## Testing

### Unit Tests

```typescript
describe('RbacService', () => {
  let service: RbacService;

  beforeEach(() => {
    service = new RbacService();
  });

  it('should check if role has permission', () => {
    expect(service.hasPermission(UserRole.ADMIN, Permission.USER_DELETE))
      .toBe(true);
    expect(service.hasPermission(UserRole.USER, Permission.USER_DELETE))
      .toBe(false);
  });
});
```

### Integration Tests

```typescript
describe('Protected Routes', () => {
  it('should allow admin to access admin routes', async () => {
    const response = await request(app.getHttpServer())
      .get('/admin/dashboard')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
  });

  it('should deny user access to admin routes', async () => {
    const response = await request(app.getHttpServer())
      .get('/admin/dashboard')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(403);
  });
});
```

## Security Considerations

1. **Always authenticate first**: Apply JwtAuthGuard before authorization guards
2. **Validate ownership**: Check resource ownership in addition to permissions
3. **Log access attempts**: Monitor unauthorized access attempts
4. **Regular audits**: Review and audit role permissions regularly
5. **Principle of least privilege**: Grant minimum necessary permissions
6. **Test boundaries**: Thoroughly test permission boundaries
7. **Document changes**: Keep permission documentation up-to-date

## Related Documentation

- [Authentication Guide](./docs/authentication.md)
- [Security Best Practices](./SECURITY.md)
- [API Documentation](./docs/api.md)
- [User Management](./docs/users.md)

## Support

For questions or issues with RBAC:
- Open an issue on GitHub
- Contact: security@chioma.app
- See: [CONTRIBUTING.md](./CONTRIBUTING.md)
