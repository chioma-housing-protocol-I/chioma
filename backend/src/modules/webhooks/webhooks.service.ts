import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository, In } from 'typeorm';
import axios from 'axios';
import { WebhookEndpoint } from './entities/webhook-endpoint.entity';
import { WebhookDelivery } from './entities/webhook-delivery.entity';
import { WebhookEvent } from './webhook-event';
import { WebhookSignatureService } from './webhook-signature.service';

export interface WebhookEndpointInput {
  url: string;
  events: string[];
  secret?: string;
  isActive?: boolean;
}

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

  async createEndpoint(
    userId: string,
    input: WebhookEndpointInput,
  ): Promise<WebhookEndpoint> {
    const endpoint = this.endpointRepository.create({
      userId,
      url: input.url,
      events: input.events as WebhookEvent[],
      secret: input.secret ?? null,
      isActive: input.isActive ?? true,
    });

    return this.endpointRepository.save(endpoint);
  }

  async listEndpointsForUser(userId: string): Promise<WebhookEndpoint[]> {
    return this.endpointRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async getEndpointForUser(
    userId: string,
    id: string,
  ): Promise<WebhookEndpoint> {
    const endpoint = await this.endpointRepository.findOne({
      where: { id, userId },
    });

    if (!endpoint) {
      throw new NotFoundException('Webhook endpoint not found');
    }

    return endpoint;
  }

  async updateEndpoint(
    userId: string,
    id: string,
    input: Partial<WebhookEndpointInput>,
  ): Promise<WebhookEndpoint> {
    const endpoint = await this.getEndpointForUser(userId, id);

    if (input.url !== undefined) endpoint.url = input.url;
    if (input.events !== undefined)
      endpoint.events = input.events as WebhookEvent[];
    if (input.secret !== undefined) endpoint.secret = input.secret;
    if (input.isActive !== undefined) endpoint.isActive = input.isActive;

    return this.endpointRepository.save(endpoint);
  }

  async deleteEndpoint(userId: string, id: string): Promise<void> {
    const endpoint = await this.getEndpointForUser(userId, id);
    await this.endpointRepository.remove(endpoint);
  }

  async listDeliveriesForUser(
    userId: string,
    endpointId: string,
  ): Promise<WebhookDelivery[]> {
    await this.getEndpointForUser(userId, endpointId);

    return this.deliveryRepository.find({
      where: { endpointId },
      order: { createdAt: 'DESC' },
    });
  }

  async triggerTestEvent(
    userId: string,
    endpointId: string,
    event: WebhookEvent,
    payload: Record<string, unknown>,
  ): Promise<WebhookDelivery> {
    const endpoint = await this.getEndpointForUser(userId, endpointId);
    return this.deliverEvent(endpoint, event, payload);
  }

  async retryDelivery(
    userId: string,
    endpointId: string,
    options: {
      deliveryId?: string;
      event?: WebhookEvent;
      payload?: Record<string, unknown>;
    },
  ): Promise<WebhookDelivery> {
    const endpoint = await this.getEndpointForUser(userId, endpointId);

    if (options.deliveryId) {
      const delivery = await this.deliveryRepository.findOne({
        where: { id: options.deliveryId, endpointId },
      });

      if (!delivery) {
        throw new NotFoundException('Webhook delivery not found');
      }

      return this.deliverEvent(endpoint, delivery.event, delivery.payload);
    }

    if (!options.event) {
      throw new BadRequestException(
        'event is required when deliveryId is not provided',
      );
    }

    return this.deliverEvent(endpoint, options.event, options.payload ?? {});
  }
}
