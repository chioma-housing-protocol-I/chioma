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
    default: AuthMethod.PASSWORD 
  })
  authMethod: AuthMethod;

  @Exclude()
  @Column({ name: 'refresh_token', nullable: true })
  refreshToken: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
