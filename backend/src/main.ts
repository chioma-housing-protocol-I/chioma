import * as Sentry from '@sentry/nestjs';
import { startTracing } from './common/tracing/tracing';

// Initialize OpenTelemetry tracing FIRST
if (process.env.OTEL_ENABLED !== 'false') {
  startTracing();
}

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
import { ValidationPipe, VersioningType, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { LoggerMiddleware } from './common/middleware/logger.middleware';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { RateLimitInterceptor } from './common/interceptors/rate-limit.interceptor';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from './common/services/logger.service';
import { registerGracefulShutdown } from './config/graceful-shutdown';

const bootstrapLogger = new Logger('Bootstrap');

// Graceful shutdown state
let isShuttingDown = false;
let activeConnections = 0;

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  // Use custom logger service
  const loggerService = app.get(LoggerService);
  app.useLogger(loggerService);

  const configService = app.get(ConfigService);

  // Parse CORS origins from environment variable
  const corsOrigins = configService
    .get<string>('CORS_ORIGINS')
    ?.split(',')
    .map((origin) => origin.trim()) || [
    configService.get<string>('FRONTEND_URL') || 'http://localhost:3000',
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
      'X-API-Key',
      'X-Webhook-Signature',
      'X-Webhook-Timestamp',
    ],
    exposedHeaders: [
      'X-RateLimit-Limit',
      'X-RateLimit-Remaining',
      'X-RateLimit-Reset',
    ],
    maxAge: 86400, // 24 hours for preflight cache
  });

  app.setGlobalPrefix('api', {
    exclude: [
      'health',
      'health/detailed',
      'security.txt',
      '.well-known',
      'developer-portal',
      'metrics',
    ],
  });

  // Configure request size limits
  const jsonLimit =
    configService.get<string>('REQUEST_SIZE_LIMIT_JSON') || '1mb';
  const urlencodedLimit =
    configService.get<string>('REQUEST_SIZE_LIMIT_URLENCODED') || '1mb';
  const rawBodySaver = (
    req: express.Request & { rawBody?: string },
    _res: express.Response,
    buffer: Buffer,
  ) => {
    if (buffer.length > 0) {
      req.rawBody = buffer.toString('utf8');
    }
  };

  // Stamp request start time as the outermost layer so wall-clock latency
  // includes auth, guards, and all middleware — including rejected 401/403s.
  if (process.env.RESPONSE_TIME_ENABLED !== 'false') {
    app.use(
      (
        req: express.Request,
        _res: express.Response,
        next: express.NextFunction,
      ) => {
        (req as any)._startTime = Date.now();
        next();
      },
    );
  }

  app.use(express.json({ limit: jsonLimit, verify: rawBodySaver }));
  app.use(
    express.urlencoded({
      extended: true,
      limit: urlencodedLimit,
      verify: rawBodySaver,
    }),
  );

  const loggerMiddleware = new LoggerMiddleware(loggerService);
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
    .setDescription(
      'REST API for Chioma — a Stellar blockchain-based rental payment platform. ' +
        'Supports landlords, agents, and tenants with JWT and Stellar (SEP-0010) authentication, ' +
        'rent agreements, payments, escrow, disputes, and KYC.',
    )
    .setVersion('1.0')
    .setContact('Chioma', 'https://chioma.app', 'support@chioma.app')
    .setLicense('Open Source', 'https://github.com/chioma/chioma')
    .addServer(
      configService.get<string>('API_BASE_URL') || 'http://localhost:5000',
      'Default',
    )
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT access token from /auth/login or /auth/register',
      },
      'JWT-auth',
    )
    .addTag(
      'Authentication',
      'Register, login, MFA, password reset, Stellar auth',
    )
    .addTag('Users', 'Current user profile and settings')
    .addTag('Rent Agreements', 'Create and manage rental agreements')
    .addTag('Properties', 'Property listings and search')
    .addTag('Payments', 'Payments, payment methods, schedules')
    .addTag('Stellar', 'Stellar accounts, payments, escrow')
    .addTag('Anchor', 'Fiat deposit/withdraw via Stellar anchors')
    .addTag('Disputes', 'Dispute creation and resolution')
    .addTag('Audit Logs', 'Audit and compliance logs')
    .addTag('Security', 'security.txt and security policy')
    .addTag('Health', 'Service health checks')
    .addTag('Storage', 'File upload/download URLs')
    .addTag('Reviews', 'Property and user reviews')
    .addTag('KYC', 'Identity verification')
    .addTag('Maintenance', 'Maintenance requests')
    .addTag('System', 'Root and misc endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    operationIdFactory: (controllerKey: string, methodKey: string) =>
      `${controllerKey}_${methodKey}`,
  });

  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'list',
      filter: true,
      showRequestDuration: true,
    },
    customSiteTitle: 'Chioma API Docs',
  });

  registerGracefulShutdown(app, { logger: bootstrapLogger });

  const port = process.env.PORT ?? 5000;
  const server = await app.listen(port);
  bootstrapLogger.log(`Application started on port ${port}`);

  // ==================== GRACEFUL SHUTDOWN ====================
  // Track active connections
  server.on('connection', (conn) => {
    activeConnections++;
    conn.on('close', () => {
      activeConnections--;
    });
  });

  // Handle graceful shutdown signals
  const gracefulShutdown = async (signal: string) => {
    if (isShuttingDown) {
      bootstrapLogger.warn(`Shutdown already in progress, ignoring ${signal}`);
      return;
    }

    isShuttingDown = true;
    bootstrapLogger.log(`Received ${signal}, starting graceful shutdown...`);

    // Stop accepting new connections
    server.close(async () => {
      bootstrapLogger.log('HTTP server closed');
    });

    // Wait for active connections to close (with timeout)
    const shutdownTimeout = parseInt(
      process.env.GRACEFUL_SHUTDOWN_TIMEOUT || '30000',
      10,
    );
    const startTime = Date.now();

    while (activeConnections > 0) {
      const elapsed = Date.now() - startTime;
      if (elapsed > shutdownTimeout) {
        bootstrapLogger.warn(
          `Graceful shutdown timeout exceeded. Forcing exit with ${activeConnections} active connections.`,
        );
        break;
      }
      bootstrapLogger.log(
        `Waiting for ${activeConnections} active connections to close...`,
      );
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    // Close database connections
    try {
      const dataSource = app.get('DataSource');
      if (dataSource?.isInitialized) {
        bootstrapLogger.log('Closing database connections...');
        await dataSource.destroy();
        bootstrapLogger.log('Database connections closed');
      }
    } catch (error) {
      bootstrapLogger.error('Error closing database connections:', error);
    }

    // Close Redis connections
    try {
      const redisService = app.get('RedisService');
      if (redisService?.disconnect) {
        bootstrapLogger.log('Closing Redis connections...');
        await redisService.disconnect();
        bootstrapLogger.log('Redis connections closed');
      }
    } catch (error) {
      bootstrapLogger.error('Error closing Redis connections:', error);
    }

    // Close NestJS application
    await app.close();
    bootstrapLogger.log('Application closed successfully');
    process.exit(0);
  };

  // Register signal handlers
  process.on('SIGTERM', () => {
    void gracefulShutdown('SIGTERM');
  });
  process.on('SIGINT', () => {
    void gracefulShutdown('SIGINT');
  });

  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    bootstrapLogger.error('Uncaught Exception:', error);
    gracefulShutdown('uncaughtException');
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    bootstrapLogger.error(
      'Unhandled Rejection at:',
      promise,
      'reason:',
      reason,
    );
    gracefulShutdown('unhandledRejection');
  });
}
void bootstrap();
