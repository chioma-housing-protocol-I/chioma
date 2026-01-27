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

  transform(value: unknown, metadata: ArgumentMetadata): unknown {
    if (metadata.type !== 'body' && metadata.type !== 'query') {
      return value;
    }

    return this.sanitize(value);
  }

  private sanitize(value: unknown): unknown {
    if (value === null || value === undefined) {
      return value;
    }

    if (typeof value === 'string') {
      return this.sanitizeString(value);
    }

    if (Array.isArray(value)) {
      return value.map((item: unknown) => this.sanitize(item));
    }

    if (typeof value === 'object') {
      const sanitized: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(
        value as Record<string, unknown>,
      )) {
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
    // Multi-pass sanitization to handle nested/malformed tags
    let result = value;
    let previousResult = '';

    // Keep stripping until no more changes (handles nested tags like <<script>script>)
    while (result !== previousResult) {
      previousResult = result;
      // Remove HTML tags while preserving content
      result = result.replace(/<[^>]*>/g, '');
      // Also remove any remaining angle brackets that could form tags
      result = result.replace(/</g, '').replace(/>/g, '');
    }

    return result;
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
  transform(value: unknown, metadata: ArgumentMetadata): unknown {
    if (metadata.type !== 'body' && metadata.type !== 'query') {
      return value;
    }

    return this.sanitize(value);
  }

  private sanitize(value: unknown): unknown {
    if (value === null || value === undefined) {
      return value;
    }

    if (typeof value === 'string') {
      return value.trim().normalize('NFC');
    }

    if (Array.isArray(value)) {
      return value.map((item: unknown) => this.sanitize(item));
    }

    if (typeof value === 'object') {
      const sanitized: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(
        value as Record<string, unknown>,
      )) {
        sanitized[key] = this.sanitize(val);
      }
      return sanitized;
    }

    return value;
  }
}
