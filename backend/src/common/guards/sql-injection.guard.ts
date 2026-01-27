import {
  Injectable,
  CanActivate,
  ExecutionContext,
  BadRequestException,
} from '@nestjs/common';
import { Request } from 'express';
import { SQL_INJECTION_PATTERNS } from '../constants/security.constants';

/**
 * SQL Injection Guard
 * Detects and blocks potential SQL injection attempts in query parameters
 */
@Injectable()
export class SqlInjectionGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();

    // Check query parameters
    if (request.query) {
      this.checkObject(request.query, 'query parameter');
    }

    // Check URL parameters
    if (request.params) {
      this.checkObject(request.params, 'URL parameter');
    }

    // Check body (for additional protection)
    if (request.body) {
      this.checkObject(request.body as Record<string, unknown>, 'request body');
    }

    return true;
  }

  private checkObject(obj: Record<string, unknown>, source: string): void {
    if (!obj || typeof obj !== 'object') {
      return;
    }

    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        this.checkString(value, `${source} '${key}'`);
      } else if (typeof value === 'object' && value !== null) {
        this.checkObject(value as Record<string, unknown>, source);
      }
    }
  }

  private checkString(value: string, source: string): void {
    for (const pattern of SQL_INJECTION_PATTERNS) {
      if (pattern.test(value)) {
        // Log the attempt for security monitoring
        console.warn(
          `[SECURITY] Potential SQL injection detected in ${source}: ${value.substring(0, 100)}`,
        );
        throw new BadRequestException(
          'Invalid input detected. Please check your request.',
        );
      }
    }
  }
}

/**
 * Utility function to check a single value for SQL injection
 */
export function containsSqlInjection(value: string): boolean {
  return SQL_INJECTION_PATTERNS.some((pattern) => pattern.test(value));
}

/**
 * Utility function to sanitize a string by removing SQL injection patterns
 * Use with caution - prefer rejecting malicious input over sanitizing
 */
export function sanitizeSqlInput(value: string): string {
  let sanitized = value;

  // Remove SQL comments
  sanitized = sanitized.replace(/--/g, '');

  // Remove semicolons (statement terminators)
  sanitized = sanitized.replace(/;/g, '');

  // Remove quotes that could be used for injection
  sanitized = sanitized.replace(/['"`;]/g, '');

  return sanitized;
}
