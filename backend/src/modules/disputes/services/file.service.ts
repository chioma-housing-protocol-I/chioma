import { Injectable, BadRequestException, OnModuleInit } from '@nestjs/common';
import { randomUUID } from 'crypto';
import * as path from 'path';
import * as fs from 'fs/promises';

@Injectable()
export class FileService implements OnModuleInit {
  private readonly uploadDir = process.env.UPLOAD_DIR || './uploads/disputes';
  private readonly maxFileSize = 10 * 1024 * 1024; // 10MB
  private readonly allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'video/mp4',
    'video/quicktime',
  ];

  async onModuleInit() {
    // Ensure upload directory exists
    try {
      await fs.mkdir(this.uploadDir, { recursive: true });
    } catch (error) {
      // Directory might already exist, ignore
    }
  }

  /**
   * Validate file before upload
   */
  validateFile(file: Express.Multer.File): void {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    if (file.size > this.maxFileSize) {
      throw new BadRequestException(
        `File size exceeds maximum allowed size of ${this.maxFileSize / 1024 / 1024}MB`,
      );
    }

    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `File type ${file.mimetype} is not allowed. Allowed types: ${this.allowedMimeTypes.join(', ')}`,
      );
    }
  }

  /**
   * Save file to disk and return file URL
   * In production, this should upload to S3 or similar cloud storage
   */
  async saveFile(file: Express.Multer.File, disputeId: string): Promise<string> {
    this.validateFile(file);

    const fileExtension = path.extname(file.originalname);
    const fileName = `${randomUUID()}${fileExtension}`;
    const filePath = path.join(this.uploadDir, disputeId, fileName);

    // Ensure dispute directory exists
    const disputeDir = path.join(this.uploadDir, disputeId);
    await fs.mkdir(disputeDir, { recursive: true });

    // Save file
    await fs.writeFile(filePath, file.buffer);

    // Return URL (in production, this would be an S3 URL)
    // For now, return a relative path that can be served statically
    return `/uploads/disputes/${disputeId}/${fileName}`;
  }

  /**
   * Delete file
   */
  async deleteFile(fileUrl: string): Promise<void> {
    try {
      // Extract file path from URL
      const filePath = fileUrl.replace('/uploads/disputes', this.uploadDir);
      await fs.unlink(filePath);
    } catch (error) {
      // File might not exist, ignore
    }
  }

  /**
   * Generate secure access URL for file
   * In production, this would generate a signed S3 URL
   */
  generateSecureUrl(fileUrl: string, expiresIn?: number): string {
    // For now, return the URL as-is
    // In production, implement signed URL generation
    return fileUrl;
  }
}
