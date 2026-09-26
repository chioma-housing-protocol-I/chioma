import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum AlertSeverity {
  INFO = 'info',
  WARNING = 'warning',
  CRITICAL = 'critical',
}

@Entity('performance_alerts')
@Index(['metric', 'resolved'])
export class PerformanceAlert {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  metric: string;

  @Column({ type: 'enum', enum: AlertSeverity })
  severity: AlertSeverity;

  @Column('text')
  message: string;

  @Column('double precision', { nullable: true })
  value: number | null;

  @Column('double precision', { nullable: true })
  threshold: number | null;

  @Column({ type: 'int', default: 1 })
  occurrences: number;

  @Column({ default: false })
  resolved: boolean;

  @Column({ type: 'timestamp', nullable: true })
  resolvedAt: Date | null;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  lastSeenAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
