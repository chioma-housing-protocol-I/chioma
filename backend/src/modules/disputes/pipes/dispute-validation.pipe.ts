import { ValidationPipe, BadRequestException } from '@nestjs/common';
import { DisputeStatus, DisputeType } from '../entities/dispute.entity';

export class DisputeValidationPipe extends ValidationPipe {
  constructor() {
    super({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    });
  }
}

/**
 * Custom validator for dispute status transitions
 */
export class DisputeStatusValidator {
  static isValidTransition(
    currentStatus: DisputeStatus,
    newStatus: DisputeStatus,
  ): boolean {
    const validTransitions = {
      [DisputeStatus.OPEN]: [
        DisputeStatus.UNDER_REVIEW,
        DisputeStatus.WITHDRAWN,
      ],
      [DisputeStatus.UNDER_REVIEW]: [
        DisputeStatus.RESOLVED,
        DisputeStatus.REJECTED,
        DisputeStatus.OPEN,
      ],
      [DisputeStatus.RESOLVED]: [], // Terminal state
      [DisputeStatus.REJECTED]: [DisputeStatus.OPEN], // Can be reopened
      [DisputeStatus.WITHDRAWN]: [], // Terminal state
    };

    return (
      validTransitions[currentStatus as string]?.includes(
        newStatus as string,
      ) || false
    );
  }

  static getErrorMessage(
    currentStatus: DisputeStatus,
    newStatus: DisputeStatus,
  ): string {
    return `Invalid status transition from ${currentStatus} to ${newStatus}`;
  }
}

/**
 * Custom validator for dispute types
 */
export class DisputeTypeValidator {
  static isValidType(type: string): boolean {
    return Object.values(DisputeType).includes(type as DisputeType);
  }

  static getValidTypes(): string[] {
    return Object.values(DisputeType);
  }
}

/**
 * Custom validator for dispute amounts
 */
export class DisputeAmountValidator {
  static isValidAmount(amount: number): boolean {
    return amount >= 0 && amount <= 999999999.99;
  }

  static getAmountErrorMessage(): string {
    return 'Amount must be between 0 and 999,999,999.99';
  }
}

/**
 * Evidence file validator
 */
export class EvidenceFileValidator {
  static readonly ALLOWED_MIME_TYPES = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/pdf',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];

  static readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

  static isValidFileType(mimeType: string): boolean {
    return this.ALLOWED_MIME_TYPES.includes(mimeType);
  }

  static isValidFileSize(size: number): boolean {
    return size <= this.MAX_FILE_SIZE;
  }

  static getFileTypeErrorMessage(): string {
    return `Invalid file type. Allowed types: ${this.ALLOWED_MIME_TYPES.join(', ')}`;
  }

  static getFileSizeErrorMessage(): string {
    return `File size too large. Maximum size is ${this.MAX_FILE_SIZE / (1024 * 1024)}MB`;
  }
}
