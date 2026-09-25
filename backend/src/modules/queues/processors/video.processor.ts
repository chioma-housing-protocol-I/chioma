import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from 'bull';
import { mkdirSync } from 'fs';
import { VideoProcessingService } from '../../storage/video-processing.service';
import {
  DisputeEvidence,
  EvidenceProcessingStatus,
} from '../../disputes/entities/dispute-evidence.entity';
import { requestContext } from '../../../common/request-context/request-context';

export interface VideoTranscodeJobData {
  evidenceId: number;
  sourcePath: string;
  correlationId?: string;
  requestId?: string;
  userId?: string;
}

const EVIDENCE_VARIANTS_DIR = './uploads/disputes/evidence/variants';
const EVIDENCE_VARIANTS_URL_PREFIX = '/uploads/disputes/evidence/variants';

@Processor('video-processing')
export class VideoQueueProcessor {
  private readonly logger = new Logger(VideoQueueProcessor.name);

  constructor(
    private readonly videoProcessing: VideoProcessingService,
    @InjectRepository(DisputeEvidence)
    private readonly evidenceRepository: Repository<DisputeEvidence>,
  ) {}

  @Process('transcode')
  async handleTranscodeJob(job: Job<VideoTranscodeJobData>): Promise<void> {
    const { evidenceId, sourcePath, correlationId, requestId, userId } =
      job.data;

    return requestContext.run(
      { correlationId: correlationId || requestId, requestId, userId },
      async () => {
        this.logger.log(
          `Transcoding video evidence ${evidenceId} (job ${job.id})`,
        );

        await this.evidenceRepository.update(evidenceId, {
          processingStatus: EvidenceProcessingStatus.PROCESSING,
        });

        try {
          mkdirSync(EVIDENCE_VARIANTS_DIR, { recursive: true });
          const { variants, thumbnailPath } =
            await this.videoProcessing.transcode(
              sourcePath,
              EVIDENCE_VARIANTS_DIR,
              `evidence_${evidenceId}`,
            );

          await this.evidenceRepository.update(evidenceId, {
            processingStatus: EvidenceProcessingStatus.COMPLETED,
            videoVariants: variants.map((variant) => ({
              quality: variant.quality,
              url: this.toPublicUrl(variant.filePath),
              fileSize: variant.fileSize,
            })),
            thumbnailUrl: this.toPublicUrl(thumbnailPath),
          });

          this.logger.log(
            `Video evidence ${evidenceId} transcoded: ${variants
              .map((v) => v.quality)
              .join(', ')}`,
          );
        } catch (error) {
          await this.evidenceRepository.update(evidenceId, {
            processingStatus: EvidenceProcessingStatus.FAILED,
          });
          this.logger.error(
            `Video transcode job ${job.id} failed for evidence ${evidenceId}`,
            error instanceof Error ? error.stack : String(error),
          );
          throw error;
        }
      },
    );
  }

  private toPublicUrl(filePath: string): string {
    const fileName = filePath.split('/').pop();
    return `${EVIDENCE_VARIANTS_URL_PREFIX}/${fileName}`;
  }
}
