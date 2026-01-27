import * as express from 'express';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { LoggerMiddleware } from './common/middleware/logger.middleware';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { SanitizationPipe } from './common/pipes/sanitization.pipe';
import helmet from 'helmet';
import {
  REQUEST_SIZE_LIMITS,
  CSP_DIRECTIVES,
  SECURITY_HEADERS,
} from './common/constants/security.constants';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enhanced Helmet security headers
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
  app.use(
    helmet({
      // Content Security Policy
      contentSecurityPolicy: {
        directives: {
          ...CSP_DIRECTIVES,
          connectSrc: ["'self'", frontendUrl],
        },
      },
      // HTTP Strict Transport Security
      hsts: {
        maxAge: SECURITY_HEADERS.HSTS_MAX_AGE,
        includeSubDomains: SECURITY_HEADERS.HSTS_INCLUDE_SUBDOMAINS,
        preload: SECURITY_HEADERS.HSTS_PRELOAD,
      },
      // Prevent clickjacking
      frameguard: { action: 'deny' },
      // Disable content type sniffing
      noSniff: true,
      // XSS filter
      xssFilter: true,
      // Referrer policy
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      // Cross-Origin policies
      crossOriginEmbedderPolicy: false, // Set to true for strict isolation
      crossOriginOpenerPolicy: { policy: 'same-origin' },
      crossOriginResourcePolicy: { policy: 'same-origin' },
      // DNS prefetch control
      dnsPrefetchControl: { allow: false },
      // IE no open
      ieNoOpen: true,
      // Permitted cross-domain policies
      permittedCrossDomainPolicies: { permittedPolicies: 'none' },
    }),
  );

  // Enhanced CORS configuration
  app.enableCors({
    origin: (origin, callback) => {
      const allowedOrigins = [
        frontendUrl,
        'http://localhost:3000',
        'http://localhost:3001',
      ];
      // Allow requests with no origin (mobile apps, Postman, etc.) in development
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        process.env.NODE_ENV === 'development'
      ) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Request-ID',
      'X-CSRF-Token',
      'X-API-Key',
      'X-Signature',
      'X-Timestamp',
    ],
    exposedHeaders: [
      'X-Request-ID',
      'X-RateLimit-Limit',
      'X-RateLimit-Remaining',
    ],
    maxAge: 86400, // 24 hours
  });

  app.setGlobalPrefix('api', {
    exclude: ['health', 'health/detailed', '.well-known/security.txt'],
  });

  // Request size limiting
  app.use(express.json({ limit: REQUEST_SIZE_LIMITS.JSON_LIMIT }));
  app.use(
    express.urlencoded({
      extended: true,
      limit: REQUEST_SIZE_LIMITS.URL_ENCODED_LIMIT,
    }),
  );

  // Custom middleware
  app.use(new LoggerMiddleware().use);

  // Global interceptors
  app.useGlobalInterceptors(new LoggingInterceptor());

  // Global pipes - order matters: sanitization first, then validation
  app.useGlobalPipes(
    new SanitizationPipe({
      trimStrings: true,
      stripHtml: true,
      checkXss: true,
      maxStringLength: 10000,
    }),
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      // Detailed validation errors in development only
      disableErrorMessages: process.env.NODE_ENV === 'production',
    }),
  );

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // Swagger documentation (disable in production)
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Chioma API')
      .setDescription('Stellar blockchain-based rental payment platform API')
      .setVersion('1.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter JWT token',
        },
        'JWT-auth',
      )
      .addApiKey(
        {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
          description: 'API Key for external integrations',
        },
        'API-Key',
      )
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  console.log(`Application running on port ${port}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
}
bootstrap();
