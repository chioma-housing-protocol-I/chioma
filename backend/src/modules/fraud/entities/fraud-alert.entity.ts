import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('fraud_alerts')
@Index('idx_fraud_alerts_status_created', ['status', 'createdAt'])
@Index('idx_fraud_alerts_subject', ['subjectType', 'subjectId'])
export class FraudAlertEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'subject_type', type: 'varchar', length: 32 })
  subjectType: string;

  @Column({ name: 'subject_id', type: 'uuid' })
  subjectId: string;

  @Column({ type: 'int' })
  score: number;

  @Column({ type: 'varchar', length: 16 })
  decision: string;

  @Column({
    type: process.env.DB_TYPE === 'sqlite' ? 'text' : 'jsonb',
  })
  reasons: string[];

  @Column({ name: 'model_version', type: 'varchar', length: 128 })
  modelVersion: string;

  @Column({
    type: process.env.DB_TYPE === 'sqlite' ? 'text' : 'jsonb',
    nullable: true,
  })
  features: Record<string, number> | null;

  @Column({ type: 'varchar', length: 16, default: 'open' })
  status: string;

  @Column({ name: 'resolved_at', type: 'timestamp', nullable: true })
  resolvedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
