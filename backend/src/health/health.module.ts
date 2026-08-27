import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { DatabaseHealthIndicator } from './indicators/database.indicator';
import { StellarHealthIndicator } from './indicators/stellar.indicator';
import { MemoryHealthIndicator } from './indicators/memory.indicator';
import { RedisHealthIndicator } from './indicators/redis.indicator';
import { ElasticsearchHealthIndicator } from './indicators/elasticsearch.indicator';
import { HealthAutomationService } from './health-automation.service';
import { MonitoringModule } from '../modules/monitoring/monitoring.module';
import { LockModule } from '../common/lock/lock.module';
import { CertificatePinningService } from '../common/security/certificate-pinning.service';

@Module({
  imports: [
    TerminusModule,
    HttpModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService, CertificatePinningService],
      useFactory: (
        configService: ConfigService,
        certificatePinningService: CertificatePinningService,
      ) => ({
        httpsAgent: certificatePinningService.getHttpsAgentForUrl(
          configService.get<string>(
            'STELLAR_HORIZON_URL',
            'https://horizon-testnet.stellar.org',
          ),
        ),
      }),
    }),
    TypeOrmModule.forFeature([]),
    MonitoringModule,
    LockModule,
  ],
  controllers: [HealthController],
  providers: [
    HealthService,
    DatabaseHealthIndicator,
    StellarHealthIndicator,
    MemoryHealthIndicator,
    RedisHealthIndicator,
    ElasticsearchHealthIndicator,
    HealthAutomationService,
  ],
  exports: [HealthService, DatabaseHealthIndicator],
})
export class HealthModule {}
