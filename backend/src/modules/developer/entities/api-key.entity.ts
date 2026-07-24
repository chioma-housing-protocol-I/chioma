import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum ApiKeyStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  REVOKED = 'revoked',
}

@Entity('api_keys')
export class ApiKey {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 64 })
  keyHash: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  keyPrefix: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  lastUsedAt: Date | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  expiresAt: Date | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  rotatedAt: Date | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  previousKeyHash: string | null;

  @Column({ type: 'boolean', default: false })
  isRotated: boolean;

  @Column({
    type: 'varchar',
    length: 20,
    default: ApiKeyStatus.ACTIVE,
  })
  status: ApiKeyStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  /**
   * Check if the API key is expired
   */
  isExpired(): boolean {
    if (!this.expiresAt) return false;
    return new Date() > new Date(this.expiresAt);
  }

  /**
   * Check if the API key is within the warning period (30 days before expiration)
   */
  isNearExpiration(): boolean {
    if (!this.expiresAt) return false;
    const warningDate = new Date(this.expiresAt);
    warningDate.setDate(warningDate.getDate() - 30);
    return new Date() >= warningDate && new Date() < this.expiresAt;
  }

  /**
   * Check if the API key is active and valid
   */
  isActive(): boolean {
    return this.status === ApiKeyStatus.ACTIVE && !this.isExpired();
  }
}
