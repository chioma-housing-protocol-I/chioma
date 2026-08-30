import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import { Retry } from '../../common/decorators/retry.decorator';
import { PaginationUtils } from '../../common/utils';
import { InjectRepository } from '@nestjs/typeorm';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { FileMetadata, ScanStatus } from './file-metadata.entity';
import { MalwareScanService } from './malware-scan.service';
import { ImageProcessingService } from './image-processing.service';
import { Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { AuditAction, AuditLevel } from '../audit/entities/audit-log.entity';

const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];
const ALLOWED_DOC_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];
const MAX_SIZE = 50 * 1024 * 1024; // 50MB

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private s3: S3Client;
  private bucket: string;
  private region: string;
  private cdnBaseUrl: string;

  constructor(
    @InjectRepository(FileMetadata)
    private readonly fileMetadataRepo: Repository<FileMetadata>,
    private readonly imageProcessing: ImageProcessingService,
    private readonly malwareScan: MalwareScanService,
    private readonly auditService: AuditService,
  ) {
    this.region = process.env.AWS_REGION || 'us-east-1';
    this.bucket = process.env.AWS_S3_BUCKET || '';
    this.cdnBaseUrl = process.env.CDN_BASE_URL || '';

    this.s3 = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      },
    });
  }

  async getUploadUrl(
    key: string,
    contentType: string,
    ownerId: string,
    fileName: string,
    fileSize: number,
    expiresIn = 300,
  ): Promise<string> {
    const allowedTypes = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_DOC_TYPES];
    if (!allowedTypes.includes(contentType)) {
      throw new BadRequestException('Invalid file type');
    }
    if (fileSize > MAX_SIZE) {
      throw new BadRequestException('File too large (max 50MB)');
    }

    await this.fileMetadataRepo.save({
      fileName,
      fileSize,
      fileType: contentType,
      s3Key: key,
      ownerId,
    });

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    });
    return getSignedUrl(this.s3, command, { expiresIn });
  }

  async uploadBuffer(
    buffer: Buffer,
    key: string,
    contentType: string,
    ownerId: string,
    fileName: string,
  ): Promise<{ url: string; variants?: Record<string, string> }> {
    const allowedTypes = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_DOC_TYPES];
    if (!allowedTypes.includes(contentType)) {
      throw new BadRequestException('Invalid file type');
    }
    if (buffer.length > MAX_SIZE) {
      throw new BadRequestException('File too large (max 50MB)');
    }

    const scanResult = await this.malwareScan.scan(buffer, fileName);
    if (!scanResult.clean) {
      const meta = await this.fileMetadataRepo.save({
        fileName,
        fileSize: buffer.length,
        fileType: contentType,
        s3Key: key,
        ownerId,
        scanStatus: ScanStatus.QUARANTINED,
      });
      this.logger.warn(
        `Quarantined upload ${meta.id}: ${scanResult.reason ?? 'malware detected'}`,
      );
      await this.auditService.log({
        action: AuditAction.SUSPICIOUS_ACTIVITY,
        entityType: 'FileMetadata',
        entityId: meta.id,
        performedBy: ownerId,
        level: AuditLevel.SECURITY,
        metadata: {
          fileName,
          s3Key: key,
          reason: scanResult.reason ?? 'malware_detected',
        },
      });
      throw new ForbiddenException(
        'File failed malware scan and has been quarantined',
      );
    }

    const variants: Record<string, string> = {};

    // Process images and upload all variants
    if (ALLOWED_IMAGE_TYPES.includes(contentType)) {
      try {
        const processed = await this.imageProcessing.processImage(
          buffer,
          key,
          contentType,
        );

        // Upload all variants in parallel
        await Promise.all([
          this.putObject(
            processed.original.key,
            processed.original.buffer,
            processed.original.contentType,
          ),
          this.putObject(
            processed.thumbnail.key,
            processed.thumbnail.buffer,
            processed.thumbnail.contentType,
          ),
          this.putObject(
            processed.medium.key,
            processed.medium.buffer,
            processed.medium.contentType,
          ),
          this.putObject(
            processed.webp.key,
            processed.webp.buffer,
            processed.webp.contentType,
          ),
        ]);

        variants.thumbnail = this.getPublicUrl(processed.thumbnail.key);
        variants.medium = this.getPublicUrl(processed.medium.key);
        variants.webp = this.getPublicUrl(processed.webp.key);
      } catch (e) {
        this.logger.warn(
          `Image processing failed, uploading original only: ${e.message}`,
        );
        await this.putObject(key, buffer, contentType);
      }
    } else {
      await this.putObject(key, buffer, contentType);
    }

    await this.fileMetadataRepo.save({
      fileName,
      fileSize: buffer.length,
      fileType: contentType,
      s3Key: key,
      ownerId,
      scanStatus: ScanStatus.CLEAN,
    });

    return { url: this.getPublicUrl(key), variants };
  }

  async getDownloadUrl(
    key: string,
    ownerId: string,
    expiresIn = 120,
  ): Promise<string> {
    const file = await this.fileMetadataRepo.findOne({
      where: { s3Key: key, ownerId },
    });
    if (!file) {
      throw new NotFoundException('File not found or access denied');
    }

    if (file.scanStatus === ScanStatus.QUARANTINED) {
      throw new ForbiddenException(
        'File is quarantined and cannot be retrieved',
      );
    }
    if (file.scanStatus === ScanStatus.PENDING) {
      throw new ForbiddenException(
        'File is pending malware scan and is not yet retrievable',
      );
    }

    // Return CDN URL for public assets if CDN is configured
    if (this.cdnBaseUrl) {
      return `${this.cdnBaseUrl}/${key}`;
    }

    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ResponseContentDisposition: 'attachment',
    });
    return getSignedUrl(this.s3, command, { expiresIn });
  }

  @Retry({
    maxAttempts: 3,
    delay: 500,
    backoff: 'exponential',
    backoffMultiplier: 2,
  })
  async deleteFile(key: string, ownerId: string): Promise<void> {
    const file = await this.fileMetadataRepo.findOne({
      where: { s3Key: key, ownerId },
    });
    if (!file) {
      throw new NotFoundException('File not found or access denied');
    }

    await this.s3.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
    await this.fileMetadataRepo.delete({ s3Key: key, ownerId });
    this.logger.log(`Deleted file: ${key}`);
  }

  async listFiles(ownerId: string, page = 1, limit = 20) {
    PaginationUtils.validatePagination(page, limit);
    const [data, total] = await this.fileMetadataRepo.findAndCount({
      where: { ownerId },
      order: { createdAt: 'DESC' },
      skip: PaginationUtils.calculateOffset(page, limit),
      take: limit,
    });
    return PaginationUtils.buildPaginationResponse(data, total, page, limit);
  }

  async updateMetadata(
    key: string,
    ownerId: string,
    fileName: string,
  ): Promise<FileMetadata> {
    const file = await this.fileMetadataRepo.findOne({
      where: { s3Key: key, ownerId },
    });
    if (!file) {
      throw new NotFoundException('File not found or access denied');
    }

    file.fileName = fileName;
    return this.fileMetadataRepo.save(file);
  }

  async getFileMetadata(key: string, ownerId: string): Promise<FileMetadata> {
    const file = await this.fileMetadataRepo.findOne({
      where: { s3Key: key, ownerId },
    });
    if (!file) {
      throw new NotFoundException('File not found');
    }
    return file;
  }

  @Retry({
    maxAttempts: 3,
    delay: 500,
    backoff: 'exponential',
    backoffMultiplier: 2,
  })
  private async putObject(
    key: string,
    buffer: Buffer,
    contentType: string,
  ): Promise<void> {
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        CacheControl: 'max-age=31536000', // 1 year for CDN caching
      }),
    );
  }

  private getPublicUrl(key: string): string {
    if (this.cdnBaseUrl) {
      return `${this.cdnBaseUrl}/${key}`;
    }
    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
  }
}
