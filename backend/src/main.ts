import * as Sentry from '@sentry/nestjs';

// Initialize Sentry BEFORE loading any other module
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.SENTRY_ENVIRONMENT || 'development',
  // Performance Monitoring: capture 100% of transactions in dev, tune for prod
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,
  // Disable Sentry if no DSN is configured (e.g. local dev without credentials)
  enabled: !!process.env.SENTRY_DSN,
});

import * as express from 'express';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { LoggerMiddleware } from './common/middleware/logger.middleware';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { RateLimitInterceptor } from './common/interceptors/rate-limit.interceptor';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Parse CORS origins from environment variable
  const corsOrigins = configService
    .get<string>('CORS_ORIGINS')
    ?.split(',')
    .map((origin) => origin.trim()) || [
    configService.get<string>('FRONTEND_URL') || 'http://localhost:3001',
  ];

  app.enableCors({
    origin: corsOrigins,
    credentials:
      configService.get<string>('CORS_CREDENTIALS') === 'true' || true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Request-ID',
      'X-XSRF-TOKEN',
      'X-CSRF-Token',
    ],
    exposedHeaders: [
      'X-RateLimit-Limit',
      'X-RateLimit-Remaining',
      'X-RateLimit-Reset',
    ],
    maxAge: 86400, // 24 hours for preflight cache
  });

  app.setGlobalPrefix('api', {
    exclude: ['health', 'health/detailed', 'security.txt', '.well-known'],
  });

  // Configure request size limits
  const jsonLimit =
    configService.get<string>('REQUEST_SIZE_LIMIT_JSON') || '1mb';
  const urlencodedLimit =
    configService.get<string>('REQUEST_SIZE_LIMIT_URLENCODED') || '1mb';

  app.use(express.json({ limit: jsonLimit }));
  app.use(express.urlencoded({ extended: true, limit: urlencodedLimit }));

  const loggerMiddleware = new LoggerMiddleware();
  app.use(loggerMiddleware.use.bind(loggerMiddleware));

  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new RateLimitInterceptor(),
  );

  // Enhanced ValidationPipe configuration
  const isProduction = configService.get<string>('NODE_ENV') === 'production';
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      skipMissingProperties: false,
      disableErrorMessages: isProduction,
      exceptionFactory: new ValidationPipe().createExceptionFactory(),
    }),
  );

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

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
    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('api/docs', app, document);

  await app.listen(process.env.PORT ?? 5000);
}
void bootstrap();
