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
import { CertificatePinningService } from '../../common/security/certificate-pinning.service';
import { WebhookEndpoint } from './entities/webhook-endpoint.entity';
import { WebhookDelivery } from './entities/webhook-delivery.entity';
import { WebhookEvent } from './webhook-event';
import { WebhookSignatureService } from './webhook-signature.service';
import { PaginationUtils } from '../../common/utils';
import {
  MAX_DELIVERY_ATTEMPTS,
  nextRetryAt,
} from './webhook-backoff';

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
    private readonly certificatePinningService: CertificatePinningService,
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
        this.deliverWithBackoff(endpoint, event, payload),
      ),
    );
  }

  /**
   * Attempts to deliver `event` to `endpoint` with bounded exponential
   * backoff and full jitter.
   *
   * Each retry is a separate {@link WebhookDelivery} row so the subscriber
   * can inspect every attempt via GET /developer/webhooks/:id/deliveries.
   *
   * The backoff schedule is defined in {@link BACKOFF_SCHEDULE_MS}:
   *   attempt 1 → 30 s, attempt 2 → 5 min, attempt 3 → 30 min,
   *   attempt 4 → 2 h,  attempt 5 → 8 h
   * All delays carry ±25 % jitter to prevent synchronized retry storms.
   * After the 5th unsuccessful attempt the delivery is marked exhausted.
   *
   * @returns The {@link WebhookDelivery} record for this attempt.
   */
  async deliverWithBackoff(
    endpoint: WebhookEndpoint,
    event: WebhookEvent,
    payload: Record<string, unknown>,
    attemptNumber = 1,
  ): Promise<WebhookDelivery> {
    const delivery = await this.deliverEvent(endpoint, event, payload, attemptNumber);

    if (!delivery.successful) {
      const nextAttempt = attemptNumber + 1;
      const retryDate = nextRetryAt(nextAttempt);

      if (retryDate !== null) {
        // Schedule the next retry after the computed jittered delay.
        delivery.nextRetryAt = retryDate;
        delivery.exhausted = false;
        await this.deliveryRepository.save(delivery);

        const delayMs = retryDate.getTime() - Date.now();
        setTimeout(() => {
          void this.deliverWithBackoff(endpoint, event, payload, nextAttempt);
        }, delayMs);
      } else {
        // All attempts exhausted — mark the delivery and stop scheduling.
        delivery.exhausted = true;
        delivery.nextRetryAt = null;
        await this.deliveryRepository.save(delivery);

        this.logger.error(
          `Webhook delivery exhausted after ${MAX_DELIVERY_ATTEMPTS} attempts ` +
            `for endpoint ${endpoint.id} (event: ${event}). ` +
            `Last error: ${delivery.responseBody ?? 'unknown'}`,
        );
      }
    }

    return delivery;
  }

  async deliverEvent(
    endpoint: WebhookEndpoint,
    event: WebhookEvent,
    payload: Record<string, unknown>,
    attemptNumber = 1,
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
      attemptCount: attemptNumber,
      exhausted: false,
    });

    try {
      const response = await axios.post(endpoint.url, requestPayload, {
        headers: this.webhookSignatureService.createSignedHeaders(
          requestPayload,
          secret,
        ),
        timeout: 10000,
        httpsAgent: this.certificatePinningService.getHttpsAgentForUrl(
          endpoint.url,
        ),
      });

      delivery.successful = true;
      delivery.responseStatus = response.status;
      delivery.responseBody =
        typeof response.data === 'string'
          ? response.data
          : JSON.stringify(response.data);
      delivery.deliveredAt = new Date();
      delivery.lastAttemptAt = new Date();
      delivery.errorCode = null;
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
      delivery.lastAttemptAt = new Date();
      delivery.errorCode = response?.status
        ? `HTTP_${response.status}`
        : error instanceof Error && error.message.toLowerCase().includes('timeout')
          ? 'TIMEOUT'
          : 'NETWORK_ERROR';
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
    page = 1,
    limit = 20,
  ) {
    await this.getEndpointForUser(userId, endpointId);

    PaginationUtils.validatePagination(page, limit);
    const [data, total] = await this.deliveryRepository.findAndCount({
      where: { endpointId },
      order: { createdAt: 'DESC' },
      skip: PaginationUtils.calculateOffset(page, limit),
      take: limit,
    });

    return PaginationUtils.buildPaginationResponse(data, total, page, limit);
  }

  async getDeliveryForUser(
    userId: string,
    endpointId: string,
    deliveryId: string,
  ): Promise<WebhookDelivery> {
    await this.getEndpointForUser(userId, endpointId);

    const delivery = await this.deliveryRepository.findOne({
      where: { id: deliveryId, endpointId },
    });

    if (!delivery) {
      throw new NotFoundException('Webhook delivery not found');
    }

    return delivery;
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

      // Manual retry always starts from attempt 1 so the full backoff
      // schedule is available again.
      return this.deliverWithBackoff(endpoint, delivery.event, delivery.payload, 1);
    }

    if (!options.event) {
      throw new BadRequestException(
        'event is required when deliveryId is not provided',
      );
    }

    return this.deliverWithBackoff(endpoint, options.event, options.payload ?? {}, 1);
  }
}
