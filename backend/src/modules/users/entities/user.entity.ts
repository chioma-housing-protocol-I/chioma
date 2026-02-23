import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';
import { Exclude } from 'class-transformer';

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
  LANDLORD = 'landlord',
  TENANT = 'tenant',
}

export enum AuthMethod {
  PASSWORD = 'password',
  STELLAR = 'stellar',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', unique: true })
  email: string;

  @Exclude()
  @Column({ type: 'varchar', nullable: true })
  password: string;

  @Column({ name: 'first_name', nullable: true, type: 'varchar' })
  firstName: string | null;

  @Column({ name: 'last_name', nullable: true, type: 'varchar' })
  lastName: string | null;

  @Column({ name: 'phone_number', nullable: true, type: 'varchar' })
  phoneNumber: string | null;

  @Column({ name: 'avatar_url', nullable: true, type: 'varchar' })
  avatarUrl: string | null;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.USER })
  role: UserRole;

  @Column({ name: 'email_verified', type: 'boolean', default: false })
  emailVerified: boolean;

  @Exclude()
  @Column({ name: 'verification_token', nullable: true, type: 'varchar' })
  verificationToken: string | null;

  @Exclude()
  @Column({ name: 'reset_token', nullable: true, type: 'varchar' })
  resetToken: string | null;

  @Exclude()
  @Column({ name: 'reset_token_expires', nullable: true, type: 'timestamp' })
  resetTokenExpires: Date | null;

  @Column({ name: 'failed_login_attempts', type: 'int', default: 0 })
  failedLoginAttempts: number;

  @Column({ name: 'account_locked_until', nullable: true, type: 'timestamp' })
  accountLockedUntil: Date | null;

  @Column({ name: 'last_login_at', nullable: true, type: 'timestamp' })
  lastLoginAt: Date | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({
    name: 'wallet_address',
    nullable: true,
    unique: true,
    type: 'varchar',
  })
  walletAddress: string | null;

  @Column({
    name: 'auth_method',
    type: 'enum',
    enum: AuthMethod,
    default: AuthMethod.PASSWORD,
  })
  authMethod: AuthMethod;

  @Exclude()
  @Column({ name: 'refresh_token', nullable: true, type: 'varchar' })
  refreshToken: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt?: Date | null;
}
