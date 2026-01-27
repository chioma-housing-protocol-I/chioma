import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  PASSWORD_CHANGE = 'PASSWORD_CHANGE',
  PERMISSION_CHANGE = 'PERMISSION_CHANGE',
  DATA_ACCESS = 'DATA_ACCESS',
  CONFIG_CHANGE = 'CONFIG_CHANGE',
}

export enum AuditStatus {
  SUCCESS = 'SUCCESS',
  FAILURE = 'FAILURE',
}

export enum AuditLevel {
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  SECURITY = 'SECURITY',
}

@Entity('audit_logs')
@Index(['entity_type', 'entity_id'])
@Index(['performed_by'])
@Index(['performed_at'])
export class AuditLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50 })
  action: AuditAction;

  @Column({ type: 'varchar', length: 50, nullable: true })
  entity_type: string;

  @Column({ type: 'varchar', length: 36, nullable: true })
  entity_id: string;

  @Column({ type: 'jsonb', nullable: true })
  old_values: any;

  @Column({ type: 'jsonb', nullable: true })
  new_values: any;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'performed_by' })
  performed_by_user: User;

  @Column({ type: 'uuid', nullable: true })
  performed_by: string;

  @CreateDateColumn({ type: 'timestamptz' })
  performed_at: Date;

  @Column({ type: 'inet', nullable: true })
  ip_address: string;

  @Column({ type: 'text', nullable: true })
  user_agent: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  status: AuditStatus;

  @Column({ type: 'text', nullable: true })
  error_message: string;

  @Column({ type: 'varchar', length: 20, default: 'INFO' })
  level: AuditLevel;

  @Column({ type: 'jsonb', nullable: true })
  metadata: any;
}
