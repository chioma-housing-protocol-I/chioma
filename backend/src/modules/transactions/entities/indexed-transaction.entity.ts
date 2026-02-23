import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('indexed_transactions')
export class IndexedTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', unique: true })
  hash: string;

  @Column({ type: 'decimal', precision: 20, scale: 8 })
  value: number;

  @CreateDateColumn({ type: 'timestamp' })
  indexedAt: Date;
}
