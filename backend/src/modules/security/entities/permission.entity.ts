import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum PermissionResource {
  USERS = 'users',
  PROPERTIES = 'properties',
  AGREEMENTS = 'agreements',
  PAYMENTS = 'payments',
  DISPUTES = 'disputes',
  AUDIT = 'audit',
  SECURITY = 'security',
  NOTIFICATIONS = 'notifications',
  KYC = 'kyc',
  ADMIN = 'admin',
  REPORTS = 'reports',
  BLOCKCHAIN = 'blockchain',
  STORAGE = 'storage',
}

export enum PermissionAction {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  EXECUTE = 'execute',
  EXPORT = 'export',
  MANAGE = 'manage',
}

@Entity('permissions')
@Index(['resource', 'action'], { unique: true })
export class Permission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({
    type: 'enum',
    enum: PermissionResource,
  })
  resource: PermissionResource;

  @Column({
    type: 'enum',
    enum: PermissionAction,
  })
  action: PermissionAction;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
