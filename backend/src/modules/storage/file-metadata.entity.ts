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
