import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export type DocumentStatus = 'ACTIVE' | 'ARCHIVED' | 'EXPIRED';
export type DocumentType =
  'LEASE' | 'INSPECTION' | 'RECEIPT' | 'CONTRACT' | 'OTHER';

@Entity('documents')
export class Document {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'varchar', length: 20, default: 'OTHER' })
  type: DocumentType;

  @Column({ type: 'varchar', length: 20, default: 'ACTIVE' })
  status: DocumentStatus;

  @Column({ type: 'varchar', length: 50, default: 'other' })
  category: string;

  @Column()
  fileKey: string;

  @Column()
  fileSize: number;

  @Column()
  fileType: string;

  @Column({ type: 'varchar', nullable: true })
  propertyId: string | null;

  @Column({ type: 'varchar', nullable: true })
  tenantId: string | null;

  @Column()
  ownerId: string;

  @Column({ type: 'varchar', nullable: true })
  description: string | null;

  @Column({ type: 'simple-array', nullable: true })
  sharedWith: string[] | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
