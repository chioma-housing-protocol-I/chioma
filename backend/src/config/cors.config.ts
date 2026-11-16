import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
import { Logger } from '@nestjs/common';

const logger = new Logger('CorsConfig');

/**
 * Dynamic CORS configuration based on environment
 */
export function getCorsConfig(): CorsOptions {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const corsOrigins = process.env.CORS_ORIGINS?.split(',').map((origin) =>
    origin.trim(),
  ) || [process.env.FRONTEND_URL || 'http://localhost:3000'];

  const corsConfig: CorsOptions = {
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, postman)
      if (!origin) {
        return callback(null, true);
      }

      // Check if origin is in whitelist
      const isAllowed = corsOrigins.some((allowedOrigin) => {
        // Support wildcard subdomains
        if (allowedOrigin.startsWith('*.')) {
          const domain = allowedOrigin.substring(2);
          return origin.endsWith(domain);
        }
        return origin === allowedOrigin;
      });

      if (isAllowed) {
        callback(null, true);
      } else {
        logger.warn(`CORS blocked request from origin: ${origin}`);
        callback(
          new Error(
            `Origin ${origin} is not allowed by CORS policy. Allowed origins: ${corsOrigins.join(', ')}`,
          ),
        );
      }
    },
    credentials:
      process.env.CORS_CREDENTIALS === 'true' ||
      process.env.CORS_CREDENTIALS === undefined,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Request-ID',
      'X-XSRF-TOKEN',
      'X-CSRF-Token',
      'X-API-Key',
      'X-Webhook-Signature',
      'X-Webhook-Timestamp',
      'Accept',
      'Accept-Language',
      'Content-Language',
      'X-Idempotency-Key',
      'X-Client-Version',
      'X-Device-ID',
    ],
    exposedHeaders: [
      'X-RateLimit-Limit',
      'X-RateLimit-Remaining',
      'X-RateLimit-Reset',
      'X-Request-ID',
      'X-Response-Time',
      'X-Total-Count',
      'Link',
      'ETag',
      'X-API-Version',
    ],
    // 24 hours for preflight cache
    maxAge: parseInt(process.env.CORS_MAX_AGE || '86400', 10),
    // Only set preflight continue in development
    preflightContinue: nodeEnv === 'development',
    // Only set success status in development
    optionsSuccessStatus: nodeEnv === 'development' ? 200 : 204,
  };

  logger.log(`CORS configured for environment: ${nodeEnv}`);
  logger.log(`Allowed origins: ${corsOrigins.join(', ')}`);
  logger.log(`Credentials enabled: ${corsConfig.credentials}`);

  return corsConfig;
}

/**
 * Validates CORS configuration on startup
 */
export function validateCorsConfig(): void {
  const corsOrigins = process.env.CORS_ORIGINS?.split(',').map((origin) =>
    origin.trim(),
  ) || [process.env.FRONTEND_URL || 'http://localhost:3000'];

  if (corsOrigins.length === 0) {
    logger.warn('No CORS origins configured. All origins will be blocked.');
  }

  // Warn about insecure configurations in production
  if (process.env.NODE_ENV === 'production') {
    corsOrigins.forEach((origin) => {
      if (origin === '*') {
        logger.error(
          'CRITICAL: Wildcard CORS origin (*) detected in production! This is a security risk.',
        );
      }
      if (origin.startsWith('http://')) {
        logger.warn(
          `WARNING: Non-HTTPS origin detected in production: ${origin}`,
        );
      }
      if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
        logger.warn(
          `WARNING: Localhost origin detected in production: ${origin}`,
        );
      }
    });
  }
}
