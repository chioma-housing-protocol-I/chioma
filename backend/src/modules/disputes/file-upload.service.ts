import { Injectable } from '@nestjs/common';
import { diskStorage } from 'multer';
import { extname } from 'path';

@Injectable()
export class FileUploadService {
  /**
   * Multer configuration for file uploads
   */
  static getMulterConfig() {
    return {
      storage: diskStorage({
        destination: './uploads/disputes/evidence',
        filename: (req, file, cb) => {
          const randomName = Array(32)
            .fill(null)
            .map(() => Math.round(Math.random() * 16).toString(16))
            .join('');
          cb(null, `${randomName}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        const allowedMimes = [
          'image/jpeg',
          'image/png',
          'image/gif',
          'application/pdf',
          'text/plain',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'video/mp4',
          'video/quicktime',
          'video/webm',
        ];

        if (allowedMimes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(
            new Error(
              'Invalid file type. Only images, videos, PDFs, and documents are allowed.',
            ),
            false,
          );
        }
      },
      limits: {
        fileSize: 500 * 1024 * 1024, // 500MB (accommodates video evidence)
      },
    };
  }

  /**
   * Generate secure file URL for access
   */
  generateFileUrl(filename: string): string {
    return `/uploads/disputes/evidence/${filename}`;
  }

  /**
   * Validate file before upload
   */
  validateFile(file: any): { isValid: boolean; error?: string } {
    const allowedMimes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/pdf',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'video/mp4',
      'video/quicktime',
      'video/webm',
    ];

    const isVideo = file.mimetype?.startsWith('video/');
    const maxSize = isVideo ? 500 * 1024 * 1024 : 10 * 1024 * 1024; // 500MB videos, 10MB otherwise

    if (!allowedMimes.includes(file.mimetype)) {
      return {
        isValid: false,
        error:
          'Invalid file type. Only images, videos, PDFs, and documents are allowed',
      };
    }

    if (file.size > maxSize) {
      return {
        isValid: false,
        error: `File size too large. Maximum size is ${Math.floor(maxSize / (1024 * 1024))}MB`,
      };
    }

    return { isValid: true };
  }
}
