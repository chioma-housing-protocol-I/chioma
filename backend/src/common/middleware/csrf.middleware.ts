import { Injectable, NestMiddleware, ForbiddenException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as crypto from 'crypto';
import { CSRF_SETTINGS } from '../constants/security.constants';

/**
 * Extended Request with cookies
 */
interface RequestWithCookies extends Request {
  cookies: Record<string, string>;
}

/**
 * CSRF Protection Middleware
 * Implements double-submit cookie pattern for CSRF protection
 */
@Injectable()
export class CsrfMiddleware implements NestMiddleware {
  private readonly exemptMethods = ['GET', 'HEAD', 'OPTIONS'];
  private readonly exemptPaths = [
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/refresh',
    '/api/auth/forgot-password',
    '/health',
    '/api/docs',
  ];

  use(req: RequestWithCookies, res: Response, next: NextFunction): void {
    // Skip CSRF check for exempt methods
    if (this.exemptMethods.includes(req.method)) {
      // Generate and set CSRF token for GET requests
      this.setCSRFToken(req, res);
      return next();
    }

    // Skip CSRF check for exempt paths
    if (this.isExemptPath(req.path)) {
      return next();
    }

    // Validate CSRF token for state-changing methods
    const tokenFromHeader = req.headers[CSRF_SETTINGS.HEADER_NAME] as string;
    const tokenFromCookie = req.cookies[CSRF_SETTINGS.COOKIE_NAME] as
      | string
      | undefined;

    if (!tokenFromHeader || !tokenFromCookie) {
      throw new ForbiddenException('CSRF token missing');
    }

    // Use timing-safe comparison to prevent timing attacks
    if (!this.timingSafeEqual(tokenFromHeader, tokenFromCookie)) {
      throw new ForbiddenException('CSRF token mismatch');
    }

    next();
  }

  private setCSRFToken(req: RequestWithCookies, res: Response): void {
    // Only set token if not already present
    if (!req.cookies[CSRF_SETTINGS.COOKIE_NAME]) {
      const token = this.generateToken();
      res.cookie(CSRF_SETTINGS.COOKIE_NAME, token, {
        httpOnly: false, // Must be accessible by JavaScript
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      });
    }
  }

  private generateToken(): string {
    return crypto.randomBytes(CSRF_SETTINGS.TOKEN_LENGTH).toString('hex');
  }

  private isExemptPath(path: string): boolean {
    return this.exemptPaths.some(
      (exemptPath) => path === exemptPath || path.startsWith(exemptPath + '/'),
    );
  }

  private timingSafeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);

    return crypto.timingSafeEqual(bufA, bufB);
  }
}

/**
 * CSRF Token Generator Service
 * For use in controllers that need to explicitly generate tokens
 */
@Injectable()
export class CsrfTokenService {
  generateToken(): string {
    return crypto.randomBytes(CSRF_SETTINGS.TOKEN_LENGTH).toString('hex');
  }

  validateToken(headerToken: string, cookieToken: string): boolean {
    if (!headerToken || !cookieToken) {
      return false;
    }

    if (headerToken.length !== cookieToken.length) {
      return false;
    }

    const bufA = Buffer.from(headerToken);
    const bufB = Buffer.from(cookieToken);

    return crypto.timingSafeEqual(bufA, bufB);
  }
}
