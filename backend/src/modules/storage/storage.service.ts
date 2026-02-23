import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { FileMetadata } from './file-metadata.entity';
import { FileMetadataRepository } from './file-metadata.repository';

@Injectable()
export class StorageService {
  private s3: S3Client;
  private bucket: string;
  private region: string;

  constructor(
    @InjectRepository(FileMetadataRepository)
    private readonly fileMetadataRepo: FileMetadataRepository,
  ) {
    this.region = process.env.AWS_REGION || '';
    this.bucket = process.env.AWS_S3_BUCKET || '';
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
    // Validate file type and size (example: block executables, limit size)
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (!allowedTypes.includes(contentType)) {
      throw new BadRequestException('Invalid file type');
    }
    if (fileSize > maxSize) {
      throw new BadRequestException('File too large');
    }

    // Save metadata (pending upload)
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
      ACL: 'private',
    });
    return getSignedUrl(this.s3, command, { expiresIn });
  }

  async getDownloadUrl(
    key: string,
    ownerId: string,
    expiresIn = 120,
  ): Promise<string> {
    // Check ownership
    const file = await this.fileMetadataRepo.findOne({
      where: { s3Key: key, ownerId },
    });
    if (!file) {
      throw new BadRequestException('File not found or access denied');
    }
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ResponseContentDisposition: 'attachment',
    });
    return getSignedUrl(this.s3, command, { expiresIn });
  }
}
