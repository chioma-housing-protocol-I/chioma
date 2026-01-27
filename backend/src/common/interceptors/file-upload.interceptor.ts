import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  BadRequestException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { Request } from 'express';
import * as crypto from 'crypto';
import * as path from 'path';
import {
  REQUEST_SIZE_LIMITS,
  ALLOWED_FILE_EXTENSIONS,
  ALLOWED_MIME_TYPES,
} from '../constants/security.constants';

/**
 * Uploaded file interface (Multer-compatible)
 */
interface UploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer?: Buffer;
  destination?: string;
  filename?: string;
  path?: string;
}

/**
 * Extended Request with file uploads
 */
interface RequestWithFiles extends Request {
  file?: UploadedFile;
  files?: UploadedFile[] | Record<string, UploadedFile[]>;
}

/**
 * File validation result
 */
interface FileValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Secure File Upload Interceptor
 * Validates file uploads for security
 */
@Injectable()
export class SecureFileUploadInterceptor implements NestInterceptor {
  private readonly maxFileSize: number;
  private readonly allowedExtensions: string[];
  private readonly allowedMimeTypes: string[];

  constructor(options?: {
    maxFileSize?: number;
    allowedExtensions?: string[];
    allowedMimeTypes?: string[];
  }) {
    this.maxFileSize =
      options?.maxFileSize || REQUEST_SIZE_LIMITS.FILE_UPLOAD_LIMIT;
    this.allowedExtensions =
      options?.allowedExtensions || ALLOWED_FILE_EXTENSIONS;
    this.allowedMimeTypes = options?.allowedMimeTypes || ALLOWED_MIME_TYPES;
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<RequestWithFiles>();
    const files = this.extractFiles(request);

    if (files.length > 0) {
      for (const file of files) {
        const validation = this.validateFile(file);
        if (!validation.valid) {
          throw new BadRequestException(validation.error);
        }
      }
    }

    return next.handle();
  }

  /**
   * Extract files from request (supports single and multiple file uploads)
   */
  private extractFiles(request: RequestWithFiles): UploadedFile[] {
    const files: UploadedFile[] = [];

    // Single file upload
    if (request.file) {
      files.push(request.file);
    }

    // Multiple files upload
    if (request.files) {
      if (Array.isArray(request.files)) {
        files.push(...request.files);
      } else {
        // Field-based multiple files
        for (const field of Object.values(request.files)) {
          if (Array.isArray(field)) {
            files.push(...field);
          }
        }
      }
    }

    return files;
  }

  /**
   * Validate a single file
   */
  private validateFile(file: UploadedFile): FileValidationResult {
    // Check file size
    if (file.size > this.maxFileSize) {
      return {
        valid: false,
        error: `File too large. Maximum size is ${this.maxFileSize / (1024 * 1024)}MB`,
      };
    }

    // Check file extension
    const ext = path.extname(file.originalname).toLowerCase();
    if (!this.allowedExtensions.includes(ext)) {
      return {
        valid: false,
        error: `File type ${ext} is not allowed. Allowed types: ${this.allowedExtensions.join(', ')}`,
      };
    }

    // Check MIME type
    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      return {
        valid: false,
        error: `MIME type ${file.mimetype} is not allowed`,
      };
    }

    // Validate file content matches extension (basic magic number check)
    if (file.buffer) {
      const contentValidation = this.validateFileContent(file);
      if (!contentValidation.valid) {
        return contentValidation;
      }
    }

    // Check for malicious filename patterns
    if (this.hasMaliciousFilename(file.originalname)) {
      return {
        valid: false,
        error: 'Filename contains invalid characters',
      };
    }

    return { valid: true };
  }

  /**
   * Validate file content matches expected type (magic number validation)
   */
  private validateFileContent(file: UploadedFile): FileValidationResult {
    const buffer = file.buffer;
    if (!buffer || buffer.length < 4) {
      return { valid: true }; // Cannot validate, allow
    }

    const ext = path.extname(file.originalname).toLowerCase();
    const magicNumbers: Record<string, number[]> = {
      '.jpg': [0xff, 0xd8, 0xff],
      '.jpeg': [0xff, 0xd8, 0xff],
      '.png': [0x89, 0x50, 0x4e, 0x47],
      '.gif': [0x47, 0x49, 0x46],
      '.pdf': [0x25, 0x50, 0x44, 0x46],
      '.webp': [0x52, 0x49, 0x46, 0x46], // RIFF header
    };

    const expected = magicNumbers[ext];
    if (!expected) {
      return { valid: true }; // No magic number to check
    }

    for (let i = 0; i < expected.length; i++) {
      if (buffer[i] !== expected[i]) {
        return {
          valid: false,
          error: 'File content does not match file extension',
        };
      }
    }

    return { valid: true };
  }

  /**
   * Check for malicious filename patterns
   */
  private hasMaliciousFilename(filename: string): boolean {
    // Check for path traversal attempts
    if (
      filename.includes('..') ||
      filename.includes('/') ||
      filename.includes('\\')
    ) {
      return true;
    }

    // Check for null bytes
    if (filename.includes('\0')) {
      return true;
    }

    // Check for hidden files
    if (filename.startsWith('.')) {
      return true;
    }

    // Check for double extensions (potential bypass attempts)
    const parts = filename.split('.');
    if (parts.length > 2) {
      const dangerousExtensions = [
        '.php',
        '.exe',
        '.sh',
        '.bat',
        '.cmd',
        '.js',
      ];
      for (let i = 0; i < parts.length - 1; i++) {
        if (dangerousExtensions.includes(`.${parts[i].toLowerCase()}`)) {
          return true;
        }
      }
    }

    return false;
  }
}

/**
 * Generate a secure random filename
 */
export function generateSecureFilename(originalFilename: string): string {
  const ext = path.extname(originalFilename).toLowerCase();
  const timestamp = Date.now();
  const random = crypto.randomBytes(16).toString('hex');
  return `${timestamp}-${random}${ext}`;
}

/**
 * Sanitize a filename for safe storage
 */
export function sanitizeFilename(filename: string): string {
  // Remove path components
  let sanitized = path.basename(filename);

  // Remove special characters except alphanumeric, dash, underscore, dot
  sanitized = sanitized.replace(/[^a-zA-Z0-9\-_.]/g, '_');

  // Collapse multiple underscores
  sanitized = sanitized.replace(/_+/g, '_');

  // Ensure filename is not empty
  if (!sanitized || sanitized === '.' || sanitized === '..') {
    sanitized = 'file';
  }

  // Limit length
  if (sanitized.length > 255) {
    const ext = path.extname(sanitized);
    const name = path.basename(sanitized, ext);
    sanitized = name.substring(0, 255 - ext.length) + ext;
  }

  return sanitized;
}

/**
 * Multer file filter callback type
 */
type FileFilterCallback = (error: Error | null, acceptFile: boolean) => void;

/**
 * File upload configuration factory
 */
export function createFileUploadConfig(options?: {
  maxFileSize?: number;
  allowedExtensions?: string[];
  allowedMimeTypes?: string[];
  destination?: string;
}): {
  limits: { fileSize: number };
  fileFilter: (
    req: Request,
    file: UploadedFile,
    callback: FileFilterCallback,
  ) => void;
} {
  return {
    limits: {
      fileSize: options?.maxFileSize || REQUEST_SIZE_LIMITS.FILE_UPLOAD_LIMIT,
    },
    fileFilter: (
      _req: Request,
      file: UploadedFile,
      callback: FileFilterCallback,
    ) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const allowedExt = options?.allowedExtensions || ALLOWED_FILE_EXTENSIONS;
      const allowedMime = options?.allowedMimeTypes || ALLOWED_MIME_TYPES;

      if (!allowedExt.includes(ext)) {
        return callback(
          new BadRequestException(`File type ${ext} is not allowed`),
          false,
        );
      }

      if (!allowedMime.includes(file.mimetype)) {
        return callback(
          new BadRequestException(`MIME type ${file.mimetype} is not allowed`),
          false,
        );
      }

      callback(null, true);
    },
  };
}
