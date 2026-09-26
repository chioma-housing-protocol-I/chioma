import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ApiVersionMiddleware } from './api-version.middleware';
import { ApiVersionService } from './api-version.service';

@Module({
  providers: [ApiVersionService],
  exports: [ApiVersionService],
})
export class ApiVersionModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(ApiVersionMiddleware).forRoutes('api/*path');
  }
}
