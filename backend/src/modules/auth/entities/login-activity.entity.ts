import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum LoginStatus {
  SUCCESS = 'success',
  FAILED = 'failed',
  BLOCKED = 'blocked',
  MFA_REQUIRED = 'mfa_required',
  MFA_COMPLETED = 'mfa_completed',
}

export enum LoginMethod {
  PASSWORD = 'password',
  STELLAR = 'stellar',
  MFA = 'mfa',
  REFRESH_TOKEN = 'refresh_token',
}

@Entity('login_activities')
@Index(['userId', 'createdAt'])
@Index(['ipAddress', 'createdAt'])
@Index(['status', 'createdAt'])
export class LoginActivity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId: string | null;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @Column({ type: 'varchar', nullable: true })
  email: string | null;

  @Column({
    name: 'login_method',
    type: process.env.DB_TYPE === 'sqlite' ? 'simple-enum' : 'enum',
    enum: LoginMethod,
    default: LoginMethod.PASSWORD,
  })
  loginMethod: LoginMethod;

  @Column({
    type: process.env.DB_TYPE === 'sqlite' ? 'simple-enum' : 'enum',
    enum: LoginStatus,
  })
  status: LoginStatus;

  @Column({ name: 'ip_address', type: 'varchar', length: 45, nullable: true })
  ipAddress: string | null;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  country: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  city: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  device: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  browser: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  os: string | null;

  @Column({ name: 'failure_reason', type: 'varchar', nullable: true })
  failureReason: string | null;

  @Column({ name: 'is_suspicious', type: 'boolean', default: false })
  isSuspicious: boolean;

  @Column({
    name: 'anomaly_flags',
    type: 'simple-json',
    nullable: true,
  })
  anomalyFlags?: string[] | null;

  @Column({ type: 'simple-json', nullable: true })
  metadata?: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
