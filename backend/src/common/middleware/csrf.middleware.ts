import {
  Injectable,
  NestMiddleware,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

interface RequestWithCookies extends Request {
  cookies: Record<string, string> | undefined;
}

/**
 * CSRF Protection Middleware using Double-Submit Cookie Pattern
 * Generates and validates CSRF tokens for state-changing operations
 */
@Injectable()
export class CsrfMiddleware implements NestMiddleware {
  private readonly logger = new Logger(CsrfMiddleware.name);
  private readonly enabled: boolean;
  private readonly cookieName = 'XSRF-TOKEN';
  private readonly headerName = 'X-XSRF-TOKEN';
  private readonly secret: string;

  constructor(private configService: ConfigService) {
    this.enabled =
      this.configService.get<string>('SECURITY_CSRF_ENABLED') === 'true';
    const secret =
      this.configService.get<string>('SECURITY_SESSION_SECRET') ||
      this.configService.get<string>('JWT_SECRET');
    if (this.enabled && !secret) {
      throw new Error(
        'SECURITY_SESSION_SECRET (or JWT_SECRET) is required when CSRF is enabled',
      );
    }
    this.secret = secret ?? '';
  }

  use(req: RequestWithCookies, res: Response, next: NextFunction) {
    if (!this.enabled) {
      return next();
    }

    // Skip CSRF for safe methods
    const method = req.method;
    if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      // Generate token for GET requests (for forms)
      this.generateToken(req, res);
      return next();
    }

    // Skip CSRF for health checks and public endpoints
    const path = req.path;
    if (
      path.startsWith('/health') ||
      path.startsWith('/api/docs') ||
      path.startsWith('/security.txt')
    ) {
      return next();
    }

    // Validate CSRF token for state-changing methods
    const headerKey = this.headerName.toLowerCase();
    const tokenFromHeader = req.headers[headerKey] as string | undefined;
    const tokenFromCookie = req.cookies?.[this.cookieName];

    if (!tokenFromHeader || !tokenFromCookie) {
      this.logger.warn(
        `CSRF token missing: header=${!!tokenFromHeader}, cookie=${!!tokenFromCookie}, path=${path}`,
      );
      throw new UnauthorizedException('CSRF token missing or invalid');
    }

    if (!this.validateToken(tokenFromHeader, tokenFromCookie)) {
      this.logger.warn(`CSRF token mismatch for path: ${path}`);
      throw new UnauthorizedException('CSRF token mismatch');
    }

    next();
  }

  /**
   * Generate CSRF token and set it as a cookie
   */
  private generateToken(req: RequestWithCookies, res: Response): void {
    const token = this.createToken();
    const isProduction =
      this.configService.get<string>('NODE_ENV') === 'production';

    // Cookie settings for CSRF protection
    const cookieOptions = {
      httpOnly: false, // IMPORTANT: Must be false for double-submit cookie pattern - client needs to read this
      secure: isProduction, // Only send over HTTPS in production to prevent man-in-the-middle attacks
      sameSite: 'strict' as const, // Strict same-site policy to prevent CSRF attacks
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      path: '/',
    };

    // Verify cookie settings are correctly configured
    this.verifyCookieSettings(cookieOptions, isProduction);

    // Set cookie with verified secure flags
    res.cookie(this.cookieName, token, cookieOptions);

    // Also set in response header for convenience
    res.setHeader('X-CSRF-Token', token);

    this.logger.debug(
      `CSRF token generated with settings: secure=${cookieOptions.secure}, httpOnly=${cookieOptions.httpOnly}, sameSite=${cookieOptions.sameSite}`,
    );
  }

  /**
   * Verify that cookie settings are properly configured for security
   * @throws Error if cookie settings are insecure
   */
  private verifyCookieSettings(
    cookieOptions: {
      httpOnly: boolean;
      secure: boolean;
      sameSite: 'strict' | 'lax' | 'none';
    },
    isProduction: boolean,
  ): void {
    // Verify httpOnly is false (required for double-submit pattern)
    if (cookieOptions.httpOnly !== false) {
      this.logger.error(
        'CSRF cookie httpOnly must be false for double-submit pattern',
      );
      throw new Error(
        'Invalid CSRF cookie configuration: httpOnly must be false',
      );
    }

    // Verify secure flag matches environment
    if (isProduction && !cookieOptions.secure) {
      this.logger.error(
        'CSRF cookie must have secure flag in production environment',
      );
      throw new Error(
        'Invalid CSRF cookie configuration: secure must be true in production',
      );
    }

    // Verify sameSite is set to strict or lax
    if (!['strict', 'lax'].includes(cookieOptions.sameSite)) {
      this.logger.error(
        `CSRF cookie sameSite must be 'strict' or 'lax', got: ${cookieOptions.sameSite}`,
      );
      throw new Error(
        'Invalid CSRF cookie configuration: sameSite must be strict or lax',
      );
    }

    this.logger.log(
      `CSRF cookie settings verified: environment=${isProduction ? 'production' : 'development'}, secure=${cookieOptions.secure}, httpOnly=${cookieOptions.httpOnly}, sameSite=${cookieOptions.sameSite}`,
    );
  }

  /**
   * Create a new CSRF token
   */
  private createToken(): string {
    const randomBytes = crypto.randomBytes(32).toString('hex');
    const timestamp = Date.now().toString();
    const data = `${randomBytes}:${timestamp}`;
    const hmac = crypto
      .createHmac('sha256', this.secret)
      .update(data)
      .digest('hex');
    return `${data}:${hmac}`;
  }

  /**
   * Validate CSRF token using double-submit cookie pattern
   */
  private validateToken(headerToken: string, cookieToken: string): boolean {
    // Tokens must match exactly (double-submit pattern)
    if (headerToken !== cookieToken) {
      return false;
    }

    // Verify HMAC signature
    const parts: string[] = headerToken.split(':');
    if (parts.length !== 3) {
      return false;
    }

    const [randomBytes, timestamp, hmac] = parts as [string, string, string];
    const data = `${randomBytes}:${timestamp}`;
    const expectedHmac = crypto
      .createHmac('sha256', this.secret)
      .update(data)
      .digest('hex');

    if (hmac !== expectedHmac) {
      return false;
    }

    // Check token age (max 24 hours)
    const tokenAge = Date.now() - parseInt(timestamp, 10);
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    if (tokenAge > maxAge) {
      return false;
    }

    return true;
  }
}
