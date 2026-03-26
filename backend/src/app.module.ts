import {
  Module,
  ValidationPipe,
  MiddlewareConsumer,
  NestModule,
  Logger,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD, APP_FILTER } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AgreementsModule } from './modules/agreements/agreements.module';
import { AuditModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { PropertiesModule } from './modules/properties/properties.module';
import { StellarModule } from './modules/stellar/stellar.module';
import { DisputesModule } from './modules/disputes/disputes.module';
import { MonitoringModule } from './modules/monitoring/monitoring.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import { PaymentModule } from './modules/payments/payment.module';
import { ProfileModule } from './modules/profile/profile.module';
import { StellarPayment } from './modules/stellar/entities/stellar-payment.entity';
import { SecurityModule } from './modules/security/security.module';
import { AuthRateLimitMiddleware } from './modules/auth/middleware/rate-limit.middleware';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { SecurityHeadersMiddleware } from './common/middleware/security-headers.middleware';
import { RequestSizeLimitMiddleware } from './common/middleware/request-size-limit.middleware';
import { CsrfMiddleware } from './common/middleware/csrf.middleware';
import { ThreatDetectionMiddleware } from './common/middleware/threat-detection.middleware';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-yet';
import { SentryModule } from '@sentry/nestjs/setup';
import { StorageModule } from './modules/storage/storage.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { FeedbackModule } from './modules/feedback/feedback.module';
import { DeveloperModule } from './modules/developer/developer.module';
import { SearchModule } from './modules/search/search.module';
import { JobQueueService } from './common/services/job-queue.service';
import { RateLimitingModule } from './modules/rate-limiting/rate-limiting.module';
import { RateLimitHeadersMiddleware } from './modules/rate-limiting/middleware/rate-limit-headers.middleware';
import { upstashStore } from './common/cache/upstash-cache.store';
import { AppCacheModule } from './common/cache/cache.module';
import { I18nModule } from './modules/i18n/i18n.module';
import { LocalizationMiddleware } from './modules/i18n/middleware/localization.middleware';
import { CleanupModule } from './modules/cleanup/cleanup.module';
import { AiModule } from './modules/ai/ai.module';
import { LoggerModule } from './common/services/logger.module';
import { QueuesModule } from './modules/queues/queues.module';

const appLogger = new Logger('AppModule');

@Module({
  imports: [
    ...(process.env.NODE_ENV === 'test' ? [] : [SentryModule.forRoot()]),
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    LoggerModule,
    require('./common/services/encryption.module').EncryptionModule,
    process.env.NODE_ENV === 'test'
      ? CacheModule.register({
        isGlobal: true,
        ttl: 600,
        max: 100,
      })
      : CacheModule.registerAsync({
        isGlobal: true,
        inject: [],
        useFactory: async () => {
          // Use Upstash REST API if URL is provided (better for serverless/Render)
          if (process.env.REDIS_URL && process.env.REDIS_TOKEN) {
            appLogger.log('[Redis] Using Upstash REST API');

            return {
              store: upstashStore({
                url: process.env.REDIS_URL,
                token: process.env.REDIS_TOKEN,
                ttl: 600,
              }),
            };
          }

          // Fallback to ioredis for traditional Redis connections
          const Redis = require('ioredis');

          const redisConfig: any = {
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379'),
            password: process.env.REDIS_PASSWORD || undefined,
            maxRetriesPerRequest: 3,
            retryStrategy(times: number) {
              const delay = Math.min(times * 50, 2000);
              return delay;
            },
            connectTimeout: 10000,
          };

          // Enable TLS for production Redis (e.g., Upstash)
          if (process.env.REDIS_TLS === 'true') {
            redisConfig.tls = {
              rejectUnauthorized: true,
            };
          }

          // Add username if provided (for Redis 6+ ACL)
          if (process.env.REDIS_USERNAME) {
            redisConfig.username = process.env.REDIS_USERNAME;
          }

          appLogger.log('[Redis] Using ioredis with TLS');

          const client = new Redis(redisConfig);

          return {
            store: await redisStore(client),
            ttl: 600,
          };
        },
      }),
    AppCacheModule,
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: parseInt(process.env.RATE_LIMIT_TTL!),
        limit: parseInt(process.env.RATE_LIMIT_MAX!),
      },
      {
        name: 'auth',
        ttl: parseInt(process.env.RATE_LIMIT_AUTH_TTL!),
        limit: parseInt(process.env.RATE_LIMIT_AUTH_MAX!),
      },
      {
        name: 'strict',
        ttl: parseInt(process.env.RATE_LIMIT_STRICT_TTL!),
        limit: parseInt(process.env.RATE_LIMIT_STRICT_MAX!),
      },
    ]),
    TypeOrmModule.forRootAsync({
      inject: [],
      useFactory: () => {
        const isTest = process.env.NODE_ENV === 'test';
        const openapiGenerate = process.env.OPENAPI_GENERATE === 'true';

        // For OpenAPI generation, return a minimal config that doesn't connect to DB
        if (openapiGenerate) {
          return {
            type: 'sqlite',
            database: ':memory:',
            namingStrategy: new SnakeNamingStrategy(),
            entities: [], // Don't load entities for OpenAPI generation
            synchronize: false,
            logging: false,
          };
        }

        if (isTest && process.env.DB_TYPE === 'sqlite') {
          return {
            type: 'sqlite',
            database: ':memory:',
            namingStrategy: new SnakeNamingStrategy(),
            entities: [__dirname + '/modules/**/*.entity{.ts,.js}'],
            synchronize: true,
            logging: false,
          };
        }
        const config = {
          type: 'postgres' as const,
          host: process.env.DB_HOST,
          port: parseInt(process.env.DB_PORT || '5432'),
          username: process.env.DB_USERNAME,
          password: process.env.DB_PASSWORD,
          database: process.env.DB_NAME,
          namingStrategy: new SnakeNamingStrategy(),
          entities: [__dirname + '/modules/**/*.entity{.ts,.js}'],
          migrations: isTest ? [] : [__dirname + '/migrations/*{.ts,.js}'],
          synchronize: isTest,
          logging: process.env.NODE_ENV === 'development',
        };
        appLogger.log('[TypeORM Config] PostgreSQL config');
        appLogger.debug({
          type: config.type,
          host: config.host,
          port: config.port,
          username: config.username,
          database: config.database,
        });
        return config;
      },
    }),
    AgreementsModule,
    AuditModule,
    AuthModule,
    UsersModule,
    PropertiesModule,
    StellarModule,
    DisputesModule,
    MonitoringModule,
    // Load HealthModule only when not generating OpenAPI (avoids loading broken @nestjs/terminus in script)
    ...(process.env.OPENAPI_GENERATE !== 'true'
      ? [require('./health/health.module').HealthModule]
      : []),
    PaymentModule,
    NotificationsModule,
    ProfileModule,
    SecurityModule,
    I18nModule,
    StorageModule,
    ReviewsModule,
    FeedbackModule,
    DeveloperModule,
    SearchModule,
    CleanupModule,
    AiModule,
    ...(process.env.OPENAPI_GENERATE !== 'true' ? [RateLimitingModule] : []),
    // Maintenance module
    require('./modules/maintenance/maintenance.module').MaintenanceModule,
    // KYC module
    require('./modules/kyc/kyc.module').KycModule,
    // Queue module
    ...(process.env.OPENAPI_GENERATE !== 'true' ? [QueuesModule] : []),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    JobQueueService,
    {
      provide: 'APP_PIPE',
      useClass: ValidationPipe,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
  ],
})
export class AppModule implements NestModule {
  constructor() {
    appLogger.log('Validating rate limit config');
    this.validateRateLimitConfig();
    appLogger.log('Rate limit config validation passed');
  }

  private validateRateLimitConfig(): void {
    const required = [
      'RATE_LIMIT_TTL',
      'RATE_LIMIT_MAX',
      'RATE_LIMIT_AUTH_TTL',
      'RATE_LIMIT_AUTH_MAX',
      'RATE_LIMIT_STRICT_TTL',
      'RATE_LIMIT_STRICT_MAX',
    ];

    const missing = required.filter((key) => !process.env[key]);
    if (missing.length > 0) {
      throw new Error(
        `Missing required environment variables: ${missing.join(', ')}`,
      );
    }
  }

  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LocalizationMiddleware).forRoutes('*');

    // Security headers middleware (applied to all routes)
    consumer.apply(SecurityHeadersMiddleware).forRoutes('*');

    // Request size limiting (applied to all routes)
    consumer.apply(RequestSizeLimitMiddleware).forRoutes('*');

    // CSRF protection (applied to all routes except excluded ones)
    consumer.apply(CsrfMiddleware).forRoutes('*');

    // Rate limit headers middleware (applied to all routes)
    consumer.apply(RateLimitHeadersMiddleware).forRoutes('*');

    // Auth rate limiting (applied to specific auth routes)
    consumer
      .apply(AuthRateLimitMiddleware)
      .forRoutes(
        'auth/register',
        'auth/login',
        'auth/forgot-password',
        'auth/reset-password',
      );

    // Real-time threat detection (applied to all API routes)
    consumer.apply(ThreatDetectionMiddleware).forRoutes('api/*path');
  }
}
