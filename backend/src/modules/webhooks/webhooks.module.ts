import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WebhookEndpoint } from './entities/webhook-endpoint.entity';
import { WebhookDelivery } from './entities/webhook-delivery.entity';
import { WebhookSignatureService } from './webhook-signature.service';
import { WebhooksService } from './webhooks.service';
import { WebhookSignatureGuard } from './guards/webhook-signature.guard';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([WebhookEndpoint, WebhookDelivery]),
  ],
  providers: [WebhookSignatureService, WebhooksService, WebhookSignatureGuard],
  exports: [WebhookSignatureService, WebhooksService, WebhookSignatureGuard],
})
export class WebhooksModule {}
