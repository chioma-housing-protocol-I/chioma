import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { KycStatus } from '../../kyc/kyc-status.enum';

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
  LANDLORD = 'landlord',
  TENANT = 'tenant',
  AGENT = 'agent',
}

export enum AuthMethod {
  PASSWORD = 'password',
  STELLAR = 'stellar',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar', unique: true })
  email: string;

  @Column({
    name: 'email_encrypted',
    type: 'bytea',
    nullable: true,
    select: false,
  })
  emailEncrypted?: Buffer | null;

  @Index('idx_users_email_hash', { unique: false })
  @Column({
    name: 'email_hash',
    type: 'varchar',
    length: 64,
    nullable: true,
    select: false,
  })
  emailHash?: string | null;

  @Exclude()
  @Column({ type: 'varchar', nullable: true })
  password: string;

  @Column({ name: 'first_name', nullable: true, type: 'varchar' })
  firstName: string | null;

  @Column({ name: 'last_name', nullable: true, type: 'varchar' })
  lastName: string | null;

  @Column({ name: 'phone_number', nullable: true, type: 'varchar' })
  phoneNumber: string | null;

  @Column({
    name: 'phone_number_encrypted',
    type: 'bytea',
    nullable: true,
    select: false,
  })
  phoneNumberEncrypted?: Buffer | null;

  @Index('idx_users_phone_hash', { unique: false })
  @Column({
    name: 'phone_number_hash',
    type: 'varchar',
    length: 64,
    nullable: true,
    select: false,
  })
  phoneNumberHash?: string | null;

  @Column({ name: 'avatar_url', nullable: true, type: 'varchar' })
  avatarUrl: string | null;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.USER })
  role: UserRole;

  @Column({ name: 'email_verified', type: 'boolean', default: false })
  emailVerified: boolean;

  // ✅ Moved inside the class
  @Column({
    name: 'kyc_status',
    type: 'enum',
    enum: KycStatus,
    default: KycStatus.PENDING,
  })
  kycStatus: KycStatus;

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

  @Column({ name: 'login_count', type: 'int', default: 0 })
  loginCount: number;

  @Column({
    name: 'preferred_language',
    type: 'varchar',
    length: 10,
    default: 'en',
  })
  preferredLanguage: string;

  @Column({ name: 'timezone', type: 'varchar', length: 50, default: 'UTC' })
  timezone: string;

  @Column({ name: 'two_factor_enabled', type: 'boolean', default: false })
  twoFactorEnabled: boolean;

  @Column({ name: 'email_notifications', type: 'boolean', default: true })
  emailNotifications: boolean;

  @Column({ name: 'sms_notifications', type: 'boolean', default: false })
  smsNotifications: boolean;

  @Column({ name: 'marketing_opt_in', type: 'boolean', default: false })
  marketingOptIn: boolean;

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
    name: 'wallet_address_encrypted',
    type: 'bytea',
    nullable: true,
    select: false,
  })
  walletAddressEncrypted?: Buffer | null;

  @Index('idx_users_wallet_hash', { unique: false })
  @Column({
    name: 'wallet_address_hash',
    type: 'varchar',
    length: 64,
    nullable: true,
    select: false,
  })
  walletAddressHash?: string | null;

  @Column({
    name: 'encryption_key_version',
    type: 'int',
    default: 1,
    select: false,
  })
  encryptionKeyVersion?: number;

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

  @Index({ unique: true })
  @Column({
    name: 'referral_code',
    type: 'varchar',
    length: 10,
    nullable: true,
  })
  referralCode?: string | null;

  @Column({ name: 'referred_by_id', type: 'uuid', nullable: true })
  referredById?: string | null;
}
