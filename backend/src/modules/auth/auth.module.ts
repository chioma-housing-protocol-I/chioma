import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { AuthMetricsService } from './services/auth-metrics.service';
import { AuthMetricsController } from './controllers/auth-metrics.controller';
import { StellarAuthService } from './services/stellar-auth.service';
import { StellarAuthController } from './controllers/stellar-auth.controller';
import { User } from '../users/entities/user.entity';
import { AuthMetric } from './entities/auth-metric.entity';
import { MfaDevice } from './entities/mfa-device.entity';
import { JwtStrategy } from './strategies/jwt.strategy';
import { RefreshTokenStrategy } from './strategies/refresh-token.strategy';
import { MfaService } from './services/mfa.service';
import { PasswordPolicyService } from './services/password-policy.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, AuthMetric, MfaDevice]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const secret = configService.get<string>('JWT_SECRET');
        if (!secret) {
          throw new Error('JWT_SECRET is required');
        }
        return {
          secret,
          signOptions: {
            expiresIn: '15m',
          },
        };
      },
      inject: [ConfigService],
    }),
    NotificationsModule,
  ],
  controllers: [AuthController, StellarAuthController, AuthMetricsController],
  providers: [
    AuthService,
    AuthMetricsService,
    StellarAuthService,
    MfaService,
    PasswordPolicyService,
    JwtStrategy,
    RefreshTokenStrategy,
  ],
  exports: [
    AuthService,
    AuthMetricsService,
    MfaService,
    PasswordPolicyService,
    JwtModule,
    PassportModule,
  ],
})
export class AuthModule {}
