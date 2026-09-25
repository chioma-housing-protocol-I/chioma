import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { DocumentVersion } from './entities/document-version.entity';

export enum DocumentStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  SIGNED = 'signed',
  ARCHIVED = 'archived',
}

@Entity('documents')
export class Document {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'owner_id', type: 'uuid' })
  ownerId: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({
    type: 'varchar',
    length: 20,
    default: DocumentStatus.DRAFT,
  })
  status: DocumentStatus;

  @Column({ name: 'storage_key', type: 'varchar', length: 512 })
  storageKey: string;

  @Column({ name: 'mime_type', type: 'varchar', length: 128, nullable: true })
  mimeType: string | null;

  @Column({ type: 'varchar', length: 64 })
  checksum: string;

  @Column({ name: 'current_version', type: 'int', default: 1 })
  currentVersion: number;

  @Column({ name: 'signed_at', type: 'timestamp', nullable: true })
  signedAt: Date | null;

  @Column({ name: 'signed_by', type: 'uuid', nullable: true })
  signedBy: string | null;

  @Column({
    name: 'signed_checksum',
    type: 'varchar',
    length: 64,
    nullable: true,
  })
  signedChecksum: string | null;

  @OneToMany(() => DocumentVersion, (version) => version.document)
  versions: DocumentVersion[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
