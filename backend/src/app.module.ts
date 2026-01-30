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
import { StellarModule } from './modules/stellar/stellar.module';
import { DisputesModule } from './modules/disputes/disputes.module';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import { HealthModule } from './health/health.module';
import { PaymentModule } from './modules/payments/payment.module';
import { ProfileModule } from './modules/profile/profile.module';
import { SecurityModule } from './modules/security/security.module';
import { AppDataSource } from './database/data-source';
import { AuthRateLimitMiddleware } from './modules/auth/middleware/rate-limit.middleware';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { SecurityHeadersMiddleware } from './common/middleware/security-headers.middleware';
import { RequestSizeLimitMiddleware } from './common/middleware/request-size-limit.middleware';
import { CsrfMiddleware } from './common/middleware/csrf.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: parseInt(process.env.RATE_LIMIT_TTL || '60000'),
        limit: parseInt(process.env.RATE_LIMIT_MAX || '100'),
      },
      {
        name: 'auth',
        ttl: parseInt(process.env.RATE_LIMIT_AUTH_TTL || '60000'),
        limit: parseInt(process.env.RATE_LIMIT_AUTH_MAX || '5'),
      },
      {
        name: 'strict',
        ttl: 60000,
        limit: 10,
      },
    ]),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'password123',
      database: process.env.DB_NAME || 'chioma_db',
      namingStrategy: new SnakeNamingStrategy(),
      entities: [__dirname + '/modules/**/*.entity{.ts,.js}'],
      migrations: [__dirname + '/migrations/*{.ts,.js}'],
      synchronize: false,
      logging: process.env.NODE_ENV === 'development',
    }),
    AgreementsModule,
    AuditModule,
    AuthModule,
    UsersModule,
    StellarModule,
    DisputesModule,
    HealthModule,
    PaymentModule,
    NotificationsModule,
    ProfileModule,
    SecurityModule,
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
