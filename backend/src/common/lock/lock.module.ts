import { Global, Module } from '@nestjs/common';
import { LockService } from './lock.service';
import { REDIS_CLIENT } from './redis-client.token';

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: () => {
        if (process.env.NODE_ENV === 'test') {
          return null; // Tests will mock LockService directly
        }

        const Redis = require('ioredis');
        const config: Record<string, unknown> = {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379'),
          password: process.env.REDIS_PASSWORD || undefined,
          maxRetriesPerRequest: 3,
          retryStrategy(times: number) {
            return Math.min(times * 50, 2000);
          },
          connectTimeout: 10000,
        };
        if (process.env.REDIS_TLS === 'true') {
          config.tls = { rejectUnauthorized: true };
        }
        if (process.env.REDIS_USERNAME) {
          config.username = process.env.REDIS_USERNAME;
        }
        return new Redis(config);
      },
    },
    LockService,
  ],
  exports: [LockService, REDIS_CLIENT],
})
export class LockModule { }
