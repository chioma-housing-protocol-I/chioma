import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * Runtime-configurable fraud scoring thresholds, keyed by `key` so the table
 * can hold more than one named threshold set in the future (e.g. per
 * subject type) without a schema change. Today only the `default` key is
 * used, seeded with the same values that used to be hardcoded in
 * FraudModelService.
 */
@Entity('fraud_thresholds')
export class FraudThresholds {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 100, unique: true, default: 'default' })
  key: string;

  /** Score at/above which a subject moves from `allow` to `review`. */
  @Column({ type: 'int' })
  thresholdReview: number;

  /** Score at/above which a subject moves from `review` to `block`. */
  @Column({ type: 'int' })
  thresholdBlock: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
