import {
  Module,
  ValidationPipe,
  MiddlewareConsumer,
  NestModule,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AgreementsModule } from './modules/agreements/agreements.module';
import { AuditModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { PropertiesModule } from './modules/properties/properties.module';
import { StellarModule } from './modules/stellar/stellar.module';
import { DisputesModule } from './modules/disputes/disputes.module';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import { HealthModule } from './health/health.module';
import { PaymentModule } from './modules/payments/payment.module';
import { ProfileModule } from './modules/profile/profile.module';
import { SecurityModule } from './modules/security/security.module';
import { AuthRateLimitMiddleware } from './modules/auth/middleware/rate-limit.middleware';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { SecurityHeadersMiddleware } from './common/middleware/security-headers.middleware';
import { RequestSizeLimitMiddleware } from './common/middleware/request-size-limit.middleware';
import { CsrfMiddleware } from './common/middleware/csrf.middleware';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-yet';
import { SentryModule } from '@sentry/nestjs/setup';
import { StorageModule } from './modules/storage/storage.module';

@Module({
  imports: [
    ...(process.env.NODE_ENV === 'test' ? [] : [SentryModule.forRoot()]),
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    CacheModule.registerAsync({
      isGlobal: true,
      useFactory: async () => {
        if (process.env.NODE_ENV === 'test') {
          return {
            store: 'memory',
            ttl: 600,
          };
        }
        return {
          store: await redisStore({
            socket: {
              host: process.env.REDIS_HOST || 'localhost',
              port: parseInt(process.env.REDIS_PORT || '6379'),
            },
            password: process.env.REDIS_PASSWORD || undefined,
            ttl: 600, // Default TTL in seconds
          }),
        };
      },
    }),
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
        if (isTest && process.env.DB_TYPE === 'sqlite') {
          return {
            type: 'sqlite',
            database: ':memory:',
            namingStrategy: new SnakeNamingStrategy(),
            entities: [__dirname + '/modules/**/*.entity{.ts,.js}'],
            synchronize: true, // Auto-create schema for in-memory DB
            logging: false,
          };
        }
        return {
          type: 'postgres',
          host: process.env.DB_HOST,
          port: parseInt(process.env.DB_PORT || '5432'),
          username: process.env.DB_USERNAME,
          password: process.env.DB_PASSWORD,
          database: process.env.DB_NAME,
          namingStrategy: new SnakeNamingStrategy(),
          entities: [__dirname + '/modules/**/*.entity{.ts,.js}'],
          migrations: [__dirname + '/migrations/*{.ts,.js}'],
          synchronize: false,
          logging: process.env.NODE_ENV === 'development',
        };
      },
    }),
    AgreementsModule,
    AuditModule,
    AuthModule,
    UsersModule,
    PropertiesModule,
    StellarModule,
    DisputesModule,
    HealthModule,
    PaymentModule,
    NotificationsModule,
    ProfileModule,
    SecurityModule,
    StorageModule,
    // Maintenance module
    require('./modules/maintenance/maintenance.module').MaintenanceModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: 'APP_PIPE',
      useClass: ValidationPipe,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  constructor() {
    console.log('AppModule constructor: validating rate limit config');
    this.validateRateLimitConfig();
    console.log('AppModule constructor: validation passed');
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
    // Security headers middleware (applied to all routes)
    consumer.apply(SecurityHeadersMiddleware).forRoutes('*');

    // Request size limiting (applied to all routes)
    consumer.apply(RequestSizeLimitMiddleware).forRoutes('*');

    // CSRF protection (applied to all routes except excluded ones)
    consumer.apply(CsrfMiddleware).forRoutes('*');

    // Auth rate limiting (applied to specific auth routes)
    consumer
      .apply(AuthRateLimitMiddleware)
      .forRoutes(
        'auth/register',
        'auth/login',
        'auth/forgot-password',
        'auth/reset-password',
      );
  }
}
