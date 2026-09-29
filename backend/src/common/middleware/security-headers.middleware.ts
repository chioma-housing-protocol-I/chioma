import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import { ConfigService } from '@nestjs/config';

/**
 * Enhanced security headers middleware
 * Configures Helmet with comprehensive security headers including CSP, HSTS, etc.
 */
/** Swagger UI's bundled assets need inline/eval scripts and styles to render. */
const DOCS_PATH_PREFIX = '/api/docs';

@Injectable()
export class SecurityHeadersMiddleware implements NestMiddleware {
  private readonly strictMiddleware: ReturnType<typeof helmet>;
  private readonly docsMiddleware: ReturnType<typeof helmet>;

  constructor(private configService: ConfigService) {
    const isProduction =
      this.configService.get<string>('NODE_ENV') === 'production';
    const hstsMaxAge = parseInt(
      this.configService.get<string>('SECURITY_HSTS_MAX_AGE') || '31536000',
    );
    // CSP is on by default; set SECURITY_CSP_ENABLED=false to opt out.
    const cspEnabled =
      this.configService.get<string>('SECURITY_CSP_ENABLED') !== 'false';

    const baseOptions: Parameters<typeof helmet>[0] = {
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
      crossOriginEmbedderPolicy: false, // Disabled for API compatibility
      crossOriginOpenerPolicy: {
        policy: 'same-origin',
      },
      crossOriginResourcePolicy: {
        policy: 'cross-origin',
      },
    };

    // Strict CSP for the actual API surface: no inline/eval scripts, since
    // API responses never render attacker-controlled markup or JS.
    this.strictMiddleware = helmet({
      ...baseOptions,
      contentSecurityPolicy: cspEnabled
        ? {
            directives: {
              defaultSrc: ["'self'"],
              styleSrc: ["'self'"],
              scriptSrc: ["'self'"],
              imgSrc: ["'self'", 'data:', 'https:'],
              connectSrc: ["'self'"],
              fontSrc: ["'self'", 'data:'],
              objectSrc: ["'none'"],
              mediaSrc: ["'self'"],
              frameSrc: ["'none'"],
              baseUri: ["'self'"],
              formAction: ["'self'"],
              frameAncestors: ["'none'"],
              upgradeInsecureRequests: isProduction ? [] : null,
            },
          }
        : false,
    });

    // Relaxed CSP scoped to the Swagger UI docs page, which needs inline
    // scripts/styles and eval to render its bundled assets.
    this.docsMiddleware = helmet({
      ...baseOptions,
      contentSecurityPolicy: cspEnabled
        ? {
            directives: {
              defaultSrc: ["'self'"],
              styleSrc: ["'self'", "'unsafe-inline'"],
              scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
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
    });
  }

  use(req: Request, res: Response, next: NextFunction) {
    const middleware = req.path?.startsWith(DOCS_PATH_PREFIX)
      ? this.docsMiddleware
      : this.strictMiddleware;
    middleware(req, res, next);
  }
}
