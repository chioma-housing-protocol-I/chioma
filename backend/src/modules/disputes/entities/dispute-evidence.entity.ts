import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Dispute } from './dispute.entity';
import { User } from '../../users/entities/user.entity';
import { ScanStatus } from '../../storage/file-metadata.entity';

/** Async transcoding lifecycle for video evidence. Non-video evidence stays
 * at NOT_APPLICABLE since it never enters the video processing queue. */
export enum EvidenceProcessingStatus {
  NOT_APPLICABLE = 'not_applicable',
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

/** One transcoded rendition of a video evidence file. */
export interface EvidenceVideoVariant {
  quality: string; // e.g. '1080p', '720p', '480p'
  url: string;
  fileSize: number;
}

@Entity('dispute_evidence')
export class DisputeEvidence {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'dispute_id' })
  disputeId: number;

  @ManyToOne(() => Dispute, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'dispute_id' })
  dispute: Dispute;

  @Column({ name: 'uploaded_by', type: 'uuid' })
  uploadedBy: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'uploaded_by' })
  uploader: User;

  @Column({ name: 'file_url', type: 'text' })
  fileUrl: string;

  @Column({ name: 'file_name', type: 'text' })
  fileName: string;

  @Column({ name: 'file_type', length: 100 })
  fileType: string;

  @Column({ name: 'file_size' })
  fileSize: number;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    name: 'scan_status',
    type: 'enum',
    enum: ScanStatus,
    default: ScanStatus.PENDING,
  })
  scanStatus: ScanStatus;

  @Column({
    name: 'processing_status',
    type: 'enum',
    enum: EvidenceProcessingStatus,
    default: EvidenceProcessingStatus.NOT_APPLICABLE,
  })
  processingStatus: EvidenceProcessingStatus;

  /** Populated once video transcoding completes; one entry per quality. */
  @Column({ name: 'video_variants', type: 'jsonb', nullable: true })
  videoVariants: EvidenceVideoVariant[] | null;

  @Column({ name: 'thumbnail_url', type: 'text', nullable: true })
  thumbnailUrl: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
