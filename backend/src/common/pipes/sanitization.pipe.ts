import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
} from '@nestjs/common';
import { XSS_PATTERNS } from '../constants/security.constants';

/**
 * Sanitization Pipe
 * Sanitizes incoming request data to prevent XSS attacks
 */
@Injectable()
export class SanitizationPipe implements PipeTransform {
  private readonly options: SanitizationOptions;

  constructor(options: SanitizationOptions = {}) {
    this.options = {
      trimStrings: true,
      stripHtml: true,
      checkXss: true,
      maxStringLength: 10000,
      ...options,
    };
  }

  transform(value: any, metadata: ArgumentMetadata): any {
    if (metadata.type !== 'body' && metadata.type !== 'query') {
      return value;
    }

    return this.sanitize(value);
  }

  private sanitize(value: any): any {
    if (value === null || value === undefined) {
      return value;
    }

    if (typeof value === 'string') {
      return this.sanitizeString(value);
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.sanitize(item));
    }

    if (typeof value === 'object') {
      const sanitized: Record<string, any> = {};
      for (const [key, val] of Object.entries(value)) {
        sanitized[key] = this.sanitize(val);
      }
      return sanitized;
    }

    return value;
  }

  private sanitizeString(value: string): string {
    let sanitized = value;

    // Check for XSS patterns before sanitization
    if (this.options.checkXss && this.containsXss(value)) {
      throw new BadRequestException(
        'Input contains potentially malicious content',
      );
    }

    // Trim whitespace
    if (this.options.trimStrings) {
      sanitized = sanitized.trim();
    }

    // Normalize unicode
    sanitized = sanitized.normalize('NFC');

    // Strip HTML tags if enabled
    if (this.options.stripHtml) {
      sanitized = this.stripHtmlTags(sanitized);
    }

    // Encode special characters
    sanitized = this.encodeSpecialChars(sanitized);

    // Check max length
    if (
      this.options.maxStringLength &&
      sanitized.length > this.options.maxStringLength
    ) {
      throw new BadRequestException(
        `Input exceeds maximum length of ${this.options.maxStringLength} characters`,
      );
    }

    return sanitized;
  }

  private containsXss(value: string): boolean {
    return XSS_PATTERNS.some((pattern) => pattern.test(value));
  }

  private stripHtmlTags(value: string): string {
    // Remove HTML tags while preserving content
    return value.replace(/<[^>]*>/g, '');
  }

  private encodeSpecialChars(value: string): string {
    // Encode characters that could be used in XSS
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }
}

/**
 * Options for sanitization pipe
 */
export interface SanitizationOptions {
  /** Trim leading/trailing whitespace from strings */
  trimStrings?: boolean;
  /** Strip HTML tags from strings */
  stripHtml?: boolean;
  /** Check for XSS patterns and reject if found */
  checkXss?: boolean;
  /** Maximum allowed string length */
  maxStringLength?: number;
}

/**
 * Light sanitization pipe that only trims and normalizes
 * without XSS checks (for fields that may contain HTML)
 */
@Injectable()
export class LightSanitizationPipe implements PipeTransform {
  transform(value: any, metadata: ArgumentMetadata): any {
    if (metadata.type !== 'body' && metadata.type !== 'query') {
      return value;
    }

    return this.sanitize(value);
  }

  private sanitize(value: any): any {
    if (value === null || value === undefined) {
      return value;
    }

    if (typeof value === 'string') {
      return value.trim().normalize('NFC');
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.sanitize(item));
    }

    if (typeof value === 'object') {
      const sanitized: Record<string, any> = {};
      for (const [key, val] of Object.entries(value)) {
        sanitized[key] = this.sanitize(val);
      }
      return sanitized;
    }

    return value;
  }
}
