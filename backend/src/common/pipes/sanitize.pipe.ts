import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
} from '@nestjs/common';

/**
 * Input sanitization pipe to prevent XSS attacks
 * Sanitizes string inputs by removing HTML/script tags and dangerous content
 */
@Injectable()
export class SanitizePipe implements PipeTransform {
  transform(value: unknown, metadata: ArgumentMetadata): unknown {
    if (value === null || value === undefined) {
      return value;
    }

    if (typeof value === 'string') {
      return this.sanitizeString(value);
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.transform(item, metadata));
    }

    if (typeof value === 'object') {
      const input = value as Record<string, unknown>;
      const sanitized: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(input)) {
        sanitized[key] = this.transform(val, metadata);
      }
      return sanitized as unknown;
    }

    return value;
  }

  /**
   * Escape HTML entities
   */
  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, (m) => map[m] || m);
  }

  private sanitizeString(value: string): string {
    // Remove null bytes
    let sanitized = value.replace(/\0/g, '');

    // Escape HTML entities
    sanitized = this.escapeHtml(sanitized);

    // Remove script-like patterns
    sanitized = sanitized.replace(
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      '',
    );
    sanitized = sanitized.replace(/javascript:/gi, '');
    sanitized = sanitized.replace(/on\w+\s*=/gi, ''); // Remove event handlers
    sanitized = sanitized.replace(/<iframe/gi, '');
    sanitized = sanitized.replace(/<object/gi, '');
    sanitized = sanitized.replace(/<embed/gi, '');

    // Trim whitespace
    sanitized = sanitized.trim();

    return sanitized;
  }
}

/**
 * Validation pipe that combines sanitization with validation
 * Use this as a global pipe or on specific DTOs
 */
@Injectable()
export class SanitizeValidationPipe extends SanitizePipe {
  transform(value: unknown, metadata: ArgumentMetadata): unknown {
    const sanitized = super.transform(value, metadata);

    // Additional validation for common attack patterns
    if (typeof sanitized === 'string') {
      this.validateString(sanitized);
    }

    return sanitized;
  }

  private validateString(value: string): void {
    // Check for SQL injection patterns
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/i,
      /(--|;|'|"|`)/,
      /(\b(OR|AND)\s+\d+\s*=\s*\d+)/i,
    ];

    for (const pattern of sqlPatterns) {
      if (pattern.test(value)) {
        throw new BadRequestException('Invalid input detected');
      }
    }

    // Check for XSS patterns
    const xssPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /<iframe/i,
      /<object/i,
      /<embed/i,
    ];

    for (const pattern of xssPatterns) {
      if (pattern.test(value)) {
        throw new BadRequestException('Potentially dangerous input detected');
      }
    }
  }
}
