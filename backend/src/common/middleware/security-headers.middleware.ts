import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import { ConfigService } from '@nestjs/config';

/**
 * Enhanced security headers middleware
 * Configures Helmet with comprehensive security headers including CSP, HSTS, etc.
 */
@Injectable()
export class SecurityHeadersMiddleware implements NestMiddleware {
  private readonly helmetMiddleware: ReturnType<typeof helmet>;

  constructor(private configService: ConfigService) {
    const isProduction =
      this.configService.get<string>('NODE_ENV') === 'production';
    const hstsMaxAge = parseInt(
      this.configService.get<string>('SECURITY_HSTS_MAX_AGE') || '31536000',
    );
    const cspEnabled =
      this.configService.get<string>('SECURITY_CSP_ENABLED') === 'true';

    // Configure Helmet with enhanced security headers
    this.helmetMiddleware = helmet({
      contentSecurityPolicy: cspEnabled
        ? {
            directives: {
              defaultSrc: ["'self'"],
              styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles for Swagger UI
              scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Allow inline scripts for Swagger UI
              imgSrc: ["'self'", 'data:', 'https:'],
              connectSrc: ["'self'"],
              fontSrc: ["'self'", 'data:'],
              objectSrc: ["'none'"],
              mediaSrc: ["'self'"],
              frameSrc: ["'self'"],
              baseUri: ["'self'"],
              formAction: ["'self'"],
              frameAncestors: ["'none'"],
              upgradeInsecureRequests: isProduction ? [] : null,
            },
          }
        : false,
      hsts: {
        maxAge: hstsMaxAge,
        includeSubDomains: true,
        preload: isProduction,
      },
      frameguard: {
        action: 'deny',
      },
      noSniff: true,
      referrerPolicy: {
        policy: 'strict-origin-when-cross-origin',
      },
      permittedCrossDomainPolicies: false,
      xssFilter: true,
      // expectCt is deprecated in newer helmet versions
      crossOriginEmbedderPolicy: false, // Disabled for API compatibility
      crossOriginOpenerPolicy: {
        policy: 'same-origin',
      },
      crossOriginResourcePolicy: {
        policy: 'cross-origin',
      },
    });
  }

  use(req: Request, res: Response, next: NextFunction) {
    this.helmetMiddleware(req, res, next);
  }
}
