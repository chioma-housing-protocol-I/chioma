import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum MfaDeviceType {
  TOTP = 'totp',
  BACKUP_CODE = 'backup_code',
}

export enum MfaDeviceStatus {
  ACTIVE = 'active',
  DISABLED = 'disabled',
}

@Entity('mfa_devices')
export class MfaDevice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({
    type: 'enum',
    enum: MfaDeviceType,
    default: MfaDeviceType.TOTP,
  })
  type: MfaDeviceType;

  @Column({
    type: 'enum',
    enum: MfaDeviceStatus,
    default: MfaDeviceStatus.ACTIVE,
  })
  status: MfaDeviceStatus;

  @Column({ name: 'device_name', nullable: true, type: 'varchar' })
  deviceName: string | null;

  @Column({ name: 'secret_key', nullable: true, type: 'varchar' })
  secretKey: string | null; // Encrypted TOTP secret

  @Column({ name: 'backup_codes', type: 'text', nullable: true })
  backupCodes: string | null; // JSON array of hashed backup codes

  @Column({ name: 'last_used_at', nullable: true, type: 'timestamp' })
  lastUsedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
