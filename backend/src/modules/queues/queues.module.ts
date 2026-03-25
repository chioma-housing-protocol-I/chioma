import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EmailQueueProcessor } from './processors/email.processor';
import { DocumentQueueProcessor } from './processors/document.processor';
import { BlockchainQueueProcessor } from './processors/blockchain.processor';
import { DataSyncQueueProcessor } from './processors/data-sync.processor';
import { QueueMonitoringService } from './services/queue-monitoring.service';
import { QueueManagementService } from './services/queue-management.service';
import { QueuesController } from './controllers/queues.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { StorageModule } from '../storage/storage.module';
import { StellarModule } from '../stellar/stellar.module';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const redisUrl = configService.get<string>('REDIS_URL');
        const redisToken = configService.get<string>('REDIS_TOKEN');
        const redisHost = configService.get<string>('REDIS_HOST', 'localhost');
        const redisPort = configService.get<number>('REDIS_PORT', 6379);
        const redisPassword = configService.get<string>('REDIS_PASSWORD');

        // Use Upstash REST API if available, otherwise use standard Redis
        if (redisUrl && redisToken) {
          return {
            url: redisUrl,
            token: redisToken,
          };
        }

        return {
          host: redisHost,
          port: redisPort,
          password: redisPassword,
          retryStrategy: (times: number) => Math.min(times * 50, 2000),
          maxRetriesPerRequest: null,
          enableReadyCheck: false,
        };
      },
    }),
    BullModule.registerQueue(
      { name: 'email' },
      { name: 'documents' },
      { name: 'blockchain' },
      { name: 'data-sync' },
    ),
    NotificationsModule,
    StorageModule,
    StellarModule,
  ],
  providers: [
    EmailQueueProcessor,
    DocumentQueueProcessor,
    BlockchainQueueProcessor,
    DataSyncQueueProcessor,
    QueueMonitoringService,
    QueueManagementService,
  ],
  controllers: [QueuesController],
  exports: [QueueManagementService, QueueMonitoringService],
})
export class QueuesModule {}
