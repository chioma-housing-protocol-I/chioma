import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role, SystemRole } from './entities/role.entity';
import {
  Permission,
  PermissionAction,
  PermissionResource,
} from './entities/permission.entity';

export interface PermissionCheck {
  resource: PermissionResource;
  action: PermissionAction;
}

@Injectable()
export class RbacService {
  private readonly logger = new Logger(RbacService.name);

  // Default permission matrix for system roles
  private readonly defaultPermissions: Record<SystemRole, PermissionCheck[]> = {
    [SystemRole.SUPER_ADMIN]: Object.values(PermissionResource).flatMap((r) =>
      Object.values(PermissionAction).map((a) => ({
        resource: r as PermissionResource,
        action: a as PermissionAction,
      })),
    ),
    [SystemRole.ADMIN]: [
      { resource: PermissionResource.USERS, action: PermissionAction.READ },
      { resource: PermissionResource.USERS, action: PermissionAction.UPDATE },
      { resource: PermissionResource.USERS, action: PermissionAction.DELETE },
      {
        resource: PermissionResource.PROPERTIES,
        action: PermissionAction.MANAGE,
      },
      {
        resource: PermissionResource.AGREEMENTS,
        action: PermissionAction.MANAGE,
      },
      {
        resource: PermissionResource.PAYMENTS,
        action: PermissionAction.MANAGE,
      },
      {
        resource: PermissionResource.DISPUTES,
        action: PermissionAction.MANAGE,
      },
      { resource: PermissionResource.KYC, action: PermissionAction.MANAGE },
      { resource: PermissionResource.AUDIT, action: PermissionAction.READ },
      { resource: PermissionResource.SECURITY, action: PermissionAction.READ },
      { resource: PermissionResource.REPORTS, action: PermissionAction.READ },
      { resource: PermissionResource.REPORTS, action: PermissionAction.EXPORT },
      {
        resource: PermissionResource.NOTIFICATIONS,
        action: PermissionAction.MANAGE,
      },
    ],
    [SystemRole.AUDITOR]: [
      { resource: PermissionResource.AUDIT, action: PermissionAction.READ },
      { resource: PermissionResource.AUDIT, action: PermissionAction.EXPORT },
      { resource: PermissionResource.SECURITY, action: PermissionAction.READ },
      { resource: PermissionResource.REPORTS, action: PermissionAction.READ },
      { resource: PermissionResource.REPORTS, action: PermissionAction.EXPORT },
      { resource: PermissionResource.PAYMENTS, action: PermissionAction.READ },
      {
        resource: PermissionResource.AGREEMENTS,
        action: PermissionAction.READ,
      },
    ],
    [SystemRole.SUPPORT]: [
      { resource: PermissionResource.USERS, action: PermissionAction.READ },
      { resource: PermissionResource.DISPUTES, action: PermissionAction.READ },
      {
        resource: PermissionResource.DISPUTES,
        action: PermissionAction.UPDATE,
      },
      {
        resource: PermissionResource.NOTIFICATIONS,
        action: PermissionAction.CREATE,
      },
    ],
    [SystemRole.LANDLORD]: [
      {
        resource: PermissionResource.PROPERTIES,
        action: PermissionAction.CREATE,
      },
      {
        resource: PermissionResource.PROPERTIES,
        action: PermissionAction.READ,
      },
      {
        resource: PermissionResource.PROPERTIES,
        action: PermissionAction.UPDATE,
      },
      {
        resource: PermissionResource.PROPERTIES,
        action: PermissionAction.DELETE,
      },
      {
        resource: PermissionResource.AGREEMENTS,
        action: PermissionAction.CREATE,
      },
      {
        resource: PermissionResource.AGREEMENTS,
        action: PermissionAction.READ,
      },
      {
        resource: PermissionResource.AGREEMENTS,
        action: PermissionAction.UPDATE,
      },
      { resource: PermissionResource.PAYMENTS, action: PermissionAction.READ },
      {
        resource: PermissionResource.DISPUTES,
        action: PermissionAction.CREATE,
      },
      { resource: PermissionResource.DISPUTES, action: PermissionAction.READ },
    ],
    [SystemRole.TENANT]: [
      {
        resource: PermissionResource.PROPERTIES,
        action: PermissionAction.READ,
      },
      {
        resource: PermissionResource.AGREEMENTS,
        action: PermissionAction.READ,
      },
      {
        resource: PermissionResource.PAYMENTS,
        action: PermissionAction.CREATE,
      },
      { resource: PermissionResource.PAYMENTS, action: PermissionAction.READ },
      {
        resource: PermissionResource.DISPUTES,
        action: PermissionAction.CREATE,
      },
      { resource: PermissionResource.DISPUTES, action: PermissionAction.READ },
    ],
    [SystemRole.USER]: [
      {
        resource: PermissionResource.PROPERTIES,
        action: PermissionAction.READ,
      },
      { resource: PermissionResource.USERS, action: PermissionAction.READ },
    ],
  };

  constructor(
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
    @InjectRepository(Permission)
    private permissionRepository: Repository<Permission>,
  ) {}

  /**
   * Check if a user role has a specific permission using the default matrix.
   * For DB-backed roles, use hasPermissionByRoleId.
   */
  hasPermission(
    userRole: string,
    resource: PermissionResource,
    action: PermissionAction,
  ): boolean {
    const systemRole = userRole as SystemRole;
    const permissions = this.defaultPermissions[systemRole];
    if (!permissions) return false;

    return permissions.some(
      (p) =>
        p.resource === resource &&
        (p.action === action || p.action === PermissionAction.MANAGE),
    );
  }

  /**
   * Assert permission or throw ForbiddenException.
   */
  assertPermission(
    userRole: string,
    resource: PermissionResource,
    action: PermissionAction,
  ): void {
    if (!this.hasPermission(userRole, resource, action)) {
      this.logger.warn(
        `Permission denied: role=${userRole} resource=${resource} action=${action}`,
      );
      throw new ForbiddenException(
        `Insufficient permissions: cannot ${action} ${resource}`,
      );
    }
  }

  /**
   * Get all permissions for a role from the default matrix.
   */
  getPermissionsForRole(userRole: string): PermissionCheck[] {
    const systemRole = userRole as SystemRole;
    return this.defaultPermissions[systemRole] ?? [];
  }

  /**
   * Seed default roles and permissions into the database.
   */
  async seedDefaultRoles(): Promise<void> {
    this.logger.log('Seeding default roles and permissions');

    for (const [roleName, perms] of Object.entries(this.defaultPermissions)) {
      // Upsert permissions
      const permEntities: Permission[] = [];
      for (const perm of perms) {
        let permission = await this.permissionRepository.findOne({
          where: { resource: perm.resource, action: perm.action },
        });
        if (!permission) {
          permission = this.permissionRepository.create({
            name: `${perm.action}:${perm.resource}`,
            resource: perm.resource,
            action: perm.action,
            description: `Permission to ${perm.action} ${perm.resource}`,
          });
          permission = await this.permissionRepository.save(permission);
        }
        permEntities.push(permission);
      }

      // Upsert role
      let role = await this.roleRepository.findOne({
        where: { name: roleName },
        relations: ['permissions'],
      });
      if (!role) {
        role = this.roleRepository.create({
          name: roleName,
          systemRole: roleName as SystemRole,
          description: `System role: ${roleName}`,
        });
      }
      role.permissions = permEntities;
      await this.roleRepository.save(role);
    }

    this.logger.log('Default roles and permissions seeded successfully');
  }

  /**
   * Find a role by name.
   */
  async findRoleByName(name: string): Promise<Role | null> {
    return this.roleRepository.findOne({
      where: { name },
      relations: ['permissions'],
    });
  }

  /**
   * List all roles.
   */
  async findAllRoles(): Promise<Role[]> {
    return this.roleRepository.find({ relations: ['permissions'] });
  }

  /**
   * List all permissions.
   */
  async findAllPermissions(): Promise<Permission[]> {
    return this.permissionRepository.find();
  }
}
