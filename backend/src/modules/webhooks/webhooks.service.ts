import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository, In } from 'typeorm';
import axios from 'axios';
import { WebhookEndpoint } from './entities/webhook-endpoint.entity';
import { WebhookDelivery } from './entities/webhook-delivery.entity';
import { WebhookEvent } from './webhook-event';
import { WebhookSignatureService } from './webhook-signature.service';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    @InjectRepository(WebhookEndpoint)
    private readonly endpointRepository: Repository<WebhookEndpoint>,
    @InjectRepository(WebhookDelivery)
    private readonly deliveryRepository: Repository<WebhookDelivery>,
    private readonly configService: ConfigService,
    private readonly webhookSignatureService: WebhookSignatureService,
  ) {}

  async dispatchEvent(
    event: WebhookEvent,
    payload: Record<string, unknown>,
  ): Promise<void> {
    const endpoints = await this.endpointRepository.find({
      where: {
        isActive: true,
      },
    });

    const matchingEndpoints = endpoints.filter((endpoint) =>
      endpoint.events.includes(event),
    );

    await Promise.all(
      matchingEndpoints.map((endpoint) =>
        this.deliverEvent(endpoint, event, payload),
      ),
    );
  }

  async deliverEvent(
    endpoint: WebhookEndpoint,
    event: WebhookEvent,
    payload: Record<string, unknown>,
  ): Promise<WebhookDelivery> {
    const requestPayload = JSON.stringify({
      event,
      timestamp: new Date().toISOString(),
      data: payload,
    });
    const secret =
      endpoint.secret ||
      this.configService.get<string>('WEBHOOK_SIGNATURE_SECRET') ||
      '';

    const delivery = this.deliveryRepository.create({
      endpointId: endpoint.id,
      event,
      payload: JSON.parse(requestPayload),
      successful: false,
      attemptCount: 1,
    });

    try {
      const response = await axios.post(endpoint.url, requestPayload, {
        headers: this.webhookSignatureService.createSignedHeaders(
          requestPayload,
          secret,
        ),
        timeout: 10000,
      });

      delivery.successful = true;
      delivery.responseStatus = response.status;
      delivery.responseBody =
        typeof response.data === 'string'
          ? response.data
          : JSON.stringify(response.data);
      delivery.deliveredAt = new Date();
    } catch (error) {
      const response = axios.isAxiosError(error) ? error.response : undefined;
      delivery.responseStatus = response?.status;
      delivery.responseBody =
        typeof response?.data === 'string'
          ? response.data
          : response?.data
            ? JSON.stringify(response.data)
            : error instanceof Error
              ? error.message
              : 'Unknown webhook delivery error';
      this.logger.warn(
        `Webhook delivery failed for endpoint ${endpoint.id}: ${delivery.responseBody}`,
      );
    }

    return this.deliveryRepository.save(delivery);
  }

  async findEndpoints(ids: string[]): Promise<WebhookEndpoint[]> {
    return this.endpointRepository.find({
      where: {
        id: In(ids),
      },
    });
  }
}
