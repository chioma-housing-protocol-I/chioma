import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum ScanStatus {
  PENDING = 'pending',
  CLEAN = 'clean',
  QUARANTINED = 'quarantined',
}

@Entity('file_metadata')
export class FileMetadata {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  fileName: string;

  @Column()
  fileSize: number;

  @Column()
  fileType: string;

  @Column()
  s3Key: string;

  @Column()
  ownerId: string;

  /**
   * SHA-256 digest (hex) of the uploaded buffer, computed before any
   * processing/variant generation. Lets a download or periodic integrity
   * sweep detect silent corruption (e.g. a truncated or bit-flipped object)
   * by recomputing the hash of the fetched bytes and comparing (#2091).
   */
  @Column({ nullable: true })
  checksum: string | null;

  @Column({
    type: 'enum',
    enum: ScanStatus,
    default: ScanStatus.PENDING,
  })
  scanStatus: ScanStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
