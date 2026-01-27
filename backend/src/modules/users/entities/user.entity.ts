import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
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

  @Column({ unique: true })
  email: string;

  @Exclude()
  @Column({ nullable: true })
  password: string;

  @Column({ name: 'first_name', nullable: true })
  firstName: string | null;

  @Column({ name: 'last_name', nullable: true })
  lastName: string | null;

  @Column({ name: 'phone_number', nullable: true })
  phoneNumber: string | null;

  @Column({ name: 'avatar_url', nullable: true })
  avatarUrl: string | null;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.USER })
  role: UserRole;

  @Column({ name: 'email_verified', default: false })
  emailVerified: boolean;

  @Exclude()
  @Column({ name: 'verification_token', nullable: true })
  verificationToken: string | null;

  @Exclude()
  @Column({ name: 'reset_token', nullable: true })
  resetToken: string | null;

  @Exclude()
  @Column({ name: 'reset_token_expires', nullable: true })
  resetTokenExpires: Date | null;

  @Column({ name: 'failed_login_attempts', default: 0 })
  failedLoginAttempts: number;

  @Column({ name: 'account_locked_until', nullable: true })
  accountLockedUntil: Date | null;

  @Column({ name: 'last_login_at', nullable: true })
  lastLoginAt: Date | null;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'wallet_address', nullable: true, unique: true })
  walletAddress: string | null;

  @Column({
    name: 'auth_method',
    type: 'enum',
    enum: AuthMethod,
    default: AuthMethod.PASSWORD,
  })
  authMethod: AuthMethod;

  @Exclude()
  @Column({ name: 'refresh_token', nullable: true })
  refreshToken: string | null;

  // MFA fields
  @Column({ name: 'mfa_enabled', default: false })
  mfaEnabled: boolean;

  @Exclude()
  @Column({ name: 'mfa_secret', nullable: true })
  mfaSecret: string | null;

  @Exclude()
  @Column({ name: 'mfa_backup_codes', nullable: true, type: 'text' })
  mfaBackupCodes: string | null;

  // Password history for preventing reuse
  @Exclude()
  @Column({ name: 'password_history', nullable: true, type: 'text' })
  passwordHistory: string | null;

  @Column({ name: 'password_changed_at', nullable: true })
  passwordChangedAt: Date | null;

  // Session security - invalidate all sessions after this timestamp
  @Column({ name: 'tokens_valid_after', nullable: true })
  tokensValidAfter: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
