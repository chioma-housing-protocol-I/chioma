import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { AuthMetricsService } from './services/auth-metrics.service';
import { AuthMetricsController } from './controllers/auth-metrics.controller';
import { StellarAuthService } from './services/stellar-auth.service';
import { StellarAuthController } from './controllers/stellar-auth.controller';
import { User } from '../users/entities/user.entity';
import { AuthMetric } from './entities/auth-metric.entity';
import { JwtStrategy } from './strategies/jwt.strategy';
import { RefreshTokenStrategy } from './strategies/refresh-token.strategy';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, AuthMetric]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret:
          configService.get<string>('JWT_SECRET') ||
          'your-secret-key-change-in-production',
        signOptions: {
          expiresIn: '15m',
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController, StellarAuthController, AuthMetricsController],
  providers: [AuthService, AuthMetricsService, StellarAuthService, JwtStrategy, RefreshTokenStrategy],
  exports: [AuthService, AuthMetricsService, JwtModule, PassportModule],
})
export class AuthModule {}
