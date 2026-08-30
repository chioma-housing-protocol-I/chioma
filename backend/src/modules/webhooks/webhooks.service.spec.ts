import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { WebhooksService } from './webhooks.service';
import { WebhookEndpoint } from './entities/webhook-endpoint.entity';
import { WebhookDelivery } from './entities/webhook-delivery.entity';
import { WebhookSignatureService } from './webhook-signature.service';
import { CertificatePinningService } from '../../common/security/certificate-pinning.service';
import { WebhookEvent } from './webhook-event';
import {
  BACKOFF_SCHEDULE_MS,
  MAX_DELIVERY_ATTEMPTS,
  nextRetryDelayMs,
  nextRetryAt,
} from './webhook-backoff';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('WebhooksService', () => {
  let service: WebhooksService;
  let endpointRepository: any;
  let deliveryRepository: any;
  let configService: any;

  const mockEndpoint = (overrides = {}): WebhookEndpoint =>
    ({
      id: 'endpoint-1',
      url: 'https://example.com/webhook',
      events: ['payment.received', 'payment.failed'] as WebhookEvent[],
      secret: 'endpoint-secret',
      isActive: true,
      ...overrides,
    }) as WebhookEndpoint;

  const mockDelivery = (overrides = {}): WebhookDelivery =>
    ({
      id: 'delivery-1',
      endpointId: 'endpoint-1',
      event: 'payment.received' as WebhookEvent,
      payload: {},
      successful: false,
      attemptCount: 1,
      ...overrides,
    }) as WebhookDelivery;

  beforeEach(async () => {
    endpointRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn().mockImplementation((dto) => ({ ...dto })),
      save: jest
        .fn()
        .mockImplementation((e) =>
          Promise.resolve({ ...e, id: e.id ?? 'endpoint-1' }),
        ),
      remove: jest.fn().mockImplementation((e) => Promise.resolve(e)),
    };

    deliveryRepository = {
      create: jest.fn().mockImplementation((dto) => ({ ...dto })),
      save: jest
        .fn()
        .mockImplementation((d) => Promise.resolve({ ...d, id: 'delivery-1' })),
      findOne: jest.fn(),
      find: jest.fn(),
      findAndCount: jest.fn(),
    };

    configService = {
      get: jest.fn().mockReturnValue('global-secret'),
    };

    mockedAxios.post = jest.fn();
    (mockedAxios.isAxiosError as any) = jest.fn().mockReturnValue(false);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhooksService,
        WebhookSignatureService,
        {
          provide: getRepositoryToken(WebhookEndpoint),
          useValue: endpointRepository,
        },
        {
          provide: getRepositoryToken(WebhookDelivery),
          useValue: deliveryRepository,
        },
        { provide: ConfigService, useValue: configService },
        {
          provide: CertificatePinningService,
          useValue: {
            getHttpsAgentForUrl: jest.fn(() => undefined),
            getHttpsAgent: jest.fn(() => undefined),
          },
        },
      ],
    }).compile();

    service = module.get<WebhooksService>(WebhooksService);
  });

  afterEach(() => jest.clearAllMocks());

  // ── dispatchEvent ──────────────────────────────────────────────────────────

  describe('dispatchEvent', () => {
    it('delivers to all active endpoints subscribed to the event', async () => {
      const endpoints = [
        mockEndpoint({ id: 'ep-1', events: ['payment.received'] }),
        mockEndpoint({
          id: 'ep-2',
          events: ['payment.received', 'payment.failed'],
        }),
        mockEndpoint({ id: 'ep-3', events: ['deposit.received'] }),
      ];
      endpointRepository.find.mockResolvedValue(endpoints);
      (mockedAxios.post as jest.Mock).mockResolvedValue({
        status: 200,
        data: 'ok',
      });

      await service.dispatchEvent('payment.received', { amount: 100 });

      expect(mockedAxios.post).toHaveBeenCalledTimes(2);
    });

    it('skips inactive endpoints', async () => {
      endpointRepository.find.mockResolvedValue([]);

      await service.dispatchEvent('payment.received', {});

      expect(mockedAxios.post).not.toHaveBeenCalled();
    });

    it('skips endpoints not subscribed to the event', async () => {
      endpointRepository.find.mockResolvedValue([
        mockEndpoint({ events: ['deposit.received'] }),
      ]);

      await service.dispatchEvent('payment.received', {});

      expect(mockedAxios.post).not.toHaveBeenCalled();
    });

    it('delivers to zero endpoints without throwing when none match', async () => {
      endpointRepository.find.mockResolvedValue([]);
      await expect(
        service.dispatchEvent('payment.received', {}),
      ).resolves.toBeUndefined();
    });

    it('continues delivery to remaining endpoints even if one fails', async () => {
      const endpoints = [
        mockEndpoint({ id: 'ep-1', events: ['payment.received'] }),
        mockEndpoint({ id: 'ep-2', events: ['payment.received'] }),
      ];
      endpointRepository.find.mockResolvedValue(endpoints);

      (mockedAxios.post as jest.Mock)
        .mockRejectedValueOnce(new Error('network error'))
        .mockResolvedValueOnce({ status: 200, data: 'ok' });

      await expect(
        service.dispatchEvent('payment.received', {}),
      ).resolves.toBeUndefined();
      expect(mockedAxios.post).toHaveBeenCalledTimes(2);
    });
  });

  // ── deliverEvent ───────────────────────────────────────────────────────────

  describe('deliverEvent', () => {
    it('records a successful delivery with correct status and body', async () => {
      const endpoint = mockEndpoint();
      (mockedAxios.post as jest.Mock).mockResolvedValue({
        status: 200,
        data: 'received',
      });

      const result = await service.deliverEvent(endpoint, 'payment.received', {
        amount: 50,
      });

      expect(result.successful).toBe(true);
      expect(result.responseStatus).toBe(200);
      expect(result.responseBody).toBe('received');
      expect(result.deliveredAt).toBeInstanceOf(Date);
    });

    it('records delivery as failed when axios throws a network error', async () => {
      const endpoint = mockEndpoint();
      const networkError = new Error('Connection refused');
      (mockedAxios.post as jest.Mock).mockRejectedValue(networkError);
      mockedAxios.isAxiosError.mockReturnValue(false);

      const result = await service.deliverEvent(
        endpoint,
        'payment.received',
        {},
      );

      expect(result.successful).toBe(false);
      expect(result.responseBody).toBe('Connection refused');
      expect(deliveryRepository.save).toHaveBeenCalled();
    });

    it('captures HTTP error status from AxiosError', async () => {
      const endpoint = mockEndpoint();
      const axiosError = {
        response: { status: 503, data: 'Service Unavailable' },
      };
      (mockedAxios.post as jest.Mock).mockRejectedValue(axiosError);
      mockedAxios.isAxiosError.mockReturnValue(true);

      const result = await service.deliverEvent(endpoint, 'payment.failed', {});

      expect(result.successful).toBe(false);
      expect(result.responseStatus).toBe(503);
    });

    it('stringifies non-string response body', async () => {
      const endpoint = mockEndpoint();
      (mockedAxios.post as jest.Mock).mockResolvedValue({
        status: 200,
        data: { ok: true },
      });

      const result = await service.deliverEvent(
        endpoint,
        'payment.received',
        {},
      );

      expect(result.responseBody).toBe(JSON.stringify({ ok: true }));
    });

    it('uses endpoint secret over global config secret when present', async () => {
      const endpoint = mockEndpoint({ secret: 'my-endpoint-secret' });
      (mockedAxios.post as jest.Mock).mockResolvedValue({
        status: 200,
        data: '',
      });

      await service.deliverEvent(endpoint, 'payment.received', {});

      const callArgs = (mockedAxios.post as jest.Mock).mock.calls[0];
      const headers = callArgs[2].headers as Record<string, string>;
      expect(headers['X-Webhook-Signature']).toBeDefined();
    });

    it('falls back to global config secret when endpoint has no secret', async () => {
      const endpoint = mockEndpoint({ secret: null });
      configService.get.mockReturnValue('fallback-secret');
      (mockedAxios.post as jest.Mock).mockResolvedValue({
        status: 200,
        data: '',
      });

      await service.deliverEvent(endpoint, 'payment.received', {});

      expect(configService.get).toHaveBeenCalledWith(
        'WEBHOOK_SIGNATURE_SECRET',
      );
    });

    it('includes event, timestamp, and data in the payload', async () => {
      const endpoint = mockEndpoint();
      (mockedAxios.post as jest.Mock).mockResolvedValue({
        status: 200,
        data: '',
      });

      await service.deliverEvent(endpoint, 'payment.received', { amount: 99 });

      const rawBody = (mockedAxios.post as jest.Mock).mock
        .calls[0][1] as string;
      const parsed = JSON.parse(rawBody);
      expect(parsed.event).toBe('payment.received');
      expect(parsed.timestamp).toBeDefined();
      expect(parsed.data.amount).toBe(99);
    });

    it('sets attemptCount to 1 on first delivery', async () => {
      const endpoint = mockEndpoint();
      (mockedAxios.post as jest.Mock).mockResolvedValue({
        status: 200,
        data: '',
      });

      await service.deliverEvent(endpoint, 'payment.received', {});

      const created = deliveryRepository.create.mock.calls[0][0];
      expect(created.attemptCount).toBe(1);
    });

    it('persists delivery record even on failure', async () => {
      const endpoint = mockEndpoint();
      (mockedAxios.post as jest.Mock).mockRejectedValue(new Error('timeout'));
      mockedAxios.isAxiosError.mockReturnValue(false);

      await service.deliverEvent(endpoint, 'payment.failed', {});

      expect(deliveryRepository.save).toHaveBeenCalledTimes(1);
    });
  });

  // ── findEndpoints ──────────────────────────────────────────────────────────

  describe('findEndpoints', () => {
    it('returns endpoints matching the given IDs', async () => {
      const endpoints = [
        mockEndpoint({ id: 'ep-1' }),
        mockEndpoint({ id: 'ep-2' }),
      ];
      endpointRepository.find.mockResolvedValue(endpoints);

      const result = await service.findEndpoints(['ep-1', 'ep-2']);

      expect(result).toHaveLength(2);
      expect(endpointRepository.find).toHaveBeenCalledWith({
        where: { id: expect.anything() },
      });
    });

    it('returns empty array when no IDs match', async () => {
      endpointRepository.find.mockResolvedValue([]);
      const result = await service.findEndpoints(['unknown-id']);
      expect(result).toEqual([]);
    });
  });

  // ── createEndpoint ─────────────────────────────────────────────────────────

  describe('createEndpoint', () => {
    it('creates an endpoint scoped to the given user with defaults applied', async () => {
      const result = await service.createEndpoint('user-1', {
        url: 'https://example.com/webhook',
        events: ['payment.received'],
      });

      expect(endpointRepository.create).toHaveBeenCalledWith({
        userId: 'user-1',
        url: 'https://example.com/webhook',
        events: ['payment.received'],
        secret: null,
        isActive: true,
      });
      expect(endpointRepository.save).toHaveBeenCalled();
      expect(result.userId).toBe('user-1');
    });

    it('respects an explicit secret and isActive value', async () => {
      await service.createEndpoint('user-1', {
        url: 'https://example.com/webhook',
        events: ['payment.received'],
        secret: 'my-secret',
        isActive: false,
      });

      expect(endpointRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ secret: 'my-secret', isActive: false }),
      );
    });
  });

  // ── listEndpointsForUser ───────────────────────────────────────────────────

  describe('listEndpointsForUser', () => {
    it('lists only endpoints belonging to the user, newest first', async () => {
      endpointRepository.find.mockResolvedValue([mockEndpoint()]);

      const result = await service.listEndpointsForUser('user-1');

      expect(endpointRepository.find).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        order: { createdAt: 'DESC' },
      });
      expect(result).toHaveLength(1);
    });
  });

  // ── getEndpointForUser ─────────────────────────────────────────────────────

  describe('getEndpointForUser', () => {
    it('returns the endpoint when owned by the user', async () => {
      const endpoint = mockEndpoint();
      endpointRepository.findOne.mockResolvedValue(endpoint);

      await expect(
        service.getEndpointForUser('user-1', 'endpoint-1'),
      ).resolves.toBe(endpoint);
      expect(endpointRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'endpoint-1', userId: 'user-1' },
      });
    });

    it('throws NotFoundException when the endpoint does not exist or is not owned by the user', async () => {
      endpointRepository.findOne.mockResolvedValue(null);

      await expect(
        service.getEndpointForUser('user-1', 'missing'),
      ).rejects.toThrow('Webhook endpoint not found');
    });
  });

  // ── updateEndpoint ─────────────────────────────────────────────────────────

  describe('updateEndpoint', () => {
    it('applies only the provided fields', async () => {
      const endpoint = mockEndpoint({ url: 'https://old.example.com' });
      endpointRepository.findOne.mockResolvedValue(endpoint);

      const result = await service.updateEndpoint('user-1', 'endpoint-1', {
        url: 'https://new.example.com',
      });

      expect(result.url).toBe('https://new.example.com');
      expect(result.events).toEqual(endpoint.events);
    });

    it('throws NotFoundException when the endpoint is not owned by the user', async () => {
      endpointRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateEndpoint('user-1', 'missing', { url: 'https://x.com' }),
      ).rejects.toThrow('Webhook endpoint not found');
    });
  });

  // ── deleteEndpoint ─────────────────────────────────────────────────────────

  describe('deleteEndpoint', () => {
    it('removes the endpoint when owned by the user', async () => {
      const endpoint = mockEndpoint();
      endpointRepository.findOne.mockResolvedValue(endpoint);

      await service.deleteEndpoint('user-1', 'endpoint-1');

      expect(endpointRepository.remove).toHaveBeenCalledWith(endpoint);
    });

    it('throws NotFoundException when the endpoint is not owned by the user', async () => {
      endpointRepository.findOne.mockResolvedValue(null);

      await expect(service.deleteEndpoint('user-1', 'missing')).rejects.toThrow(
        'Webhook endpoint not found',
      );
    });
  });

  // ── listDeliveriesForUser ──────────────────────────────────────────────────

  describe('listDeliveriesForUser', () => {
    it('lists deliveries for an endpoint owned by the user', async () => {
      endpointRepository.findOne.mockResolvedValue(mockEndpoint());
      deliveryRepository.findAndCount.mockResolvedValue([[mockDelivery()], 1]);

      const result = await service.listDeliveriesForUser(
        'user-1',
        'endpoint-1',
      );

      expect(deliveryRepository.findAndCount).toHaveBeenCalledWith({
        where: { endpointId: 'endpoint-1' },
        order: { createdAt: 'DESC' },
        skip: 0,
        take: 20,
      });
      expect(result.data).toHaveLength(1);
    });

    it('throws NotFoundException when the endpoint is not owned by the user', async () => {
      endpointRepository.findOne.mockResolvedValue(null);

      await expect(
        service.listDeliveriesForUser('user-1', 'missing'),
      ).rejects.toThrow('Webhook endpoint not found');
    });
  });

  // ── triggerTestEvent ───────────────────────────────────────────────────────

  describe('triggerTestEvent', () => {
    it('delivers a test event to an endpoint owned by the user', async () => {
      const endpoint = mockEndpoint();
      endpointRepository.findOne.mockResolvedValue(endpoint);
      (mockedAxios.post as jest.Mock).mockResolvedValue({
        status: 200,
        data: 'ok',
      });

      const result = await service.triggerTestEvent(
        'user-1',
        'endpoint-1',
        'payment.received',
        { amount: 10 },
      );

      expect(mockedAxios.post).toHaveBeenCalledWith(
        endpoint.url,
        expect.any(String),
        expect.any(Object),
      );
      expect(result.successful).toBe(true);
    });

    it('throws NotFoundException when the endpoint is not owned by the user', async () => {
      endpointRepository.findOne.mockResolvedValue(null);

      await expect(
        service.triggerTestEvent('user-1', 'missing', 'payment.received', {}),
      ).rejects.toThrow('Webhook endpoint not found');
    });
  });

  // ── retryDelivery ──────────────────────────────────────────────────────────

  describe('retryDelivery', () => {
    it('redelivers an existing delivery using its original event and payload', async () => {
      const endpoint = mockEndpoint();
      const delivery = mockDelivery({
        event: 'payment.failed',
        payload: { amount: 20 },
      });
      endpointRepository.findOne.mockResolvedValue(endpoint);
      deliveryRepository.findOne.mockResolvedValue(delivery);
      (mockedAxios.post as jest.Mock).mockResolvedValue({
        status: 200,
        data: 'ok',
      });

      await service.retryDelivery('user-1', 'endpoint-1', {
        deliveryId: 'delivery-1',
      });

      const rawBody = (mockedAxios.post as jest.Mock).mock.calls[0][1];
      expect(JSON.parse(rawBody).event).toBe('payment.failed');
    });

    it('throws NotFoundException when the delivery does not belong to the endpoint', async () => {
      endpointRepository.findOne.mockResolvedValue(mockEndpoint());
      deliveryRepository.findOne.mockResolvedValue(null);

      await expect(
        service.retryDelivery('user-1', 'endpoint-1', {
          deliveryId: 'missing',
        }),
      ).rejects.toThrow('Webhook delivery not found');
    });

    it('triggers a new delivery when an event is provided without a deliveryId', async () => {
      endpointRepository.findOne.mockResolvedValue(mockEndpoint());
      (mockedAxios.post as jest.Mock).mockResolvedValue({
        status: 200,
        data: 'ok',
      });

      await service.retryDelivery('user-1', 'endpoint-1', {
        event: 'payment.received',
        payload: { amount: 5 },
      });

      expect(deliveryRepository.findOne).not.toHaveBeenCalled();
      expect(mockedAxios.post).toHaveBeenCalled();
    });

    it('throws BadRequestException when neither deliveryId nor event is provided', async () => {
      endpointRepository.findOne.mockResolvedValue(mockEndpoint());

      await expect(
        service.retryDelivery('user-1', 'endpoint-1', {}),
      ).rejects.toThrow('event is required when deliveryId is not provided');
    });
  });

  // ── webhook-backoff schedule ───────────────────────────────────────────────

  describe('backoff schedule (webhook-backoff.ts)', () => {
    it('defines exactly MAX_DELIVERY_ATTEMPTS base delays', () => {
      expect(BACKOFF_SCHEDULE_MS).toHaveLength(MAX_DELIVERY_ATTEMPTS);
    });

    it('has MAX_DELIVERY_ATTEMPTS = 5', () => {
      expect(MAX_DELIVERY_ATTEMPTS).toBe(5);
    });

    it('schedule is strictly increasing', () => {
      for (let i = 1; i < BACKOFF_SCHEDULE_MS.length; i++) {
        expect(BACKOFF_SCHEDULE_MS[i]).toBeGreaterThan(BACKOFF_SCHEDULE_MS[i - 1]);
      }
    });

    it('attempt 1 base delay is 30 s', () => {
      expect(BACKOFF_SCHEDULE_MS[0]).toBe(30_000);
    });

    it('attempt 5 base delay is 8 h', () => {
      expect(BACKOFF_SCHEDULE_MS[4]).toBe(28_800_000);
    });

    it('nextRetryDelayMs returns null beyond MAX_DELIVERY_ATTEMPTS', () => {
      expect(nextRetryDelayMs(MAX_DELIVERY_ATTEMPTS + 1)).toBeNull();
    });

    it('nextRetryDelayMs stays within ±25 % of base for every attempt', () => {
      BACKOFF_SCHEDULE_MS.forEach((base, idx) => {
        const attempt = idx + 1;
        // Sample 20 times to verify jitter bounds are respected.
        for (let i = 0; i < 20; i++) {
          const delay = nextRetryDelayMs(attempt)!;
          expect(delay).toBeGreaterThanOrEqual(Math.round(base * 0.75));
          expect(delay).toBeLessThanOrEqual(Math.round(base * 1.25));
        }
      });
    });

    it('nextRetryAt returns a Date in the future for valid attempts', () => {
      const now = new Date();
      const result = nextRetryAt(1, now);
      expect(result).toBeInstanceOf(Date);
      expect(result!.getTime()).toBeGreaterThan(now.getTime());
    });

    it('nextRetryAt returns null for attempt beyond MAX_DELIVERY_ATTEMPTS', () => {
      expect(nextRetryAt(MAX_DELIVERY_ATTEMPTS + 1)).toBeNull();
    });
  });

  // ── deliverWithBackoff ─────────────────────────────────────────────────────

  describe('deliverWithBackoff', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('does not schedule a retry when the initial delivery succeeds', async () => {
      const endpoint = mockEndpoint();
      (mockedAxios.post as jest.Mock).mockResolvedValue({
        status: 200,
        data: 'ok',
      });
      const setTimeoutSpy = jest.spyOn(global, 'setTimeout');

      await service.deliverWithBackoff(endpoint, 'payment.received', {});

      expect(setTimeoutSpy).not.toHaveBeenCalled();
    });

    it('schedules a retry when the first attempt fails', async () => {
      const endpoint = mockEndpoint();
      (mockedAxios.post as jest.Mock).mockRejectedValue(new Error('timeout'));
      mockedAxios.isAxiosError.mockReturnValue(false);
      const setTimeoutSpy = jest.spyOn(global, 'setTimeout');

      await service.deliverWithBackoff(endpoint, 'payment.received', {}, 1);

      expect(setTimeoutSpy).toHaveBeenCalledTimes(1);
    });

    it('marks the delivery exhausted and does not schedule further retries on final attempt', async () => {
      const endpoint = mockEndpoint();
      (mockedAxios.post as jest.Mock).mockRejectedValue(new Error('fail'));
      mockedAxios.isAxiosError.mockReturnValue(false);
      const setTimeoutSpy = jest.spyOn(global, 'setTimeout');

      await service.deliverWithBackoff(
        endpoint,
        'payment.received',
        {},
        MAX_DELIVERY_ATTEMPTS,
      );

      expect(setTimeoutSpy).not.toHaveBeenCalled();
      // delivery.save should have been called with exhausted=true
      const lastSave = deliveryRepository.save.mock.calls.at(-1)?.[0] as WebhookDelivery;
      expect(lastSave.exhausted).toBe(true);
      expect(lastSave.nextRetryAt).toBeNull();
    });

    it('sets nextRetryAt on a failed non-final attempt', async () => {
      const endpoint = mockEndpoint();
      (mockedAxios.post as jest.Mock).mockRejectedValue(new Error('fail'));
      mockedAxios.isAxiosError.mockReturnValue(false);

      await service.deliverWithBackoff(endpoint, 'payment.received', {}, 1);

      const lastSave = deliveryRepository.save.mock.calls.at(-1)?.[0] as WebhookDelivery;
      expect(lastSave.nextRetryAt).toBeInstanceOf(Date);
    });

    it('stamps errorCode HTTP_503 on an HTTP 503 response', async () => {
      const endpoint = mockEndpoint();
      (mockedAxios.post as jest.Mock).mockRejectedValue({
        response: { status: 503, data: 'unavailable' },
      });
      mockedAxios.isAxiosError.mockReturnValue(true);

      const result = await service.deliverWithBackoff(
        endpoint,
        'payment.failed',
        {},
        MAX_DELIVERY_ATTEMPTS,
      );

      expect(result.errorCode).toBe('HTTP_503');
    });

    it('stamps errorCode NETWORK_ERROR on a non-HTTP failure', async () => {
      const endpoint = mockEndpoint();
      (mockedAxios.post as jest.Mock).mockRejectedValue(new Error('ECONNREFUSED'));
      mockedAxios.isAxiosError.mockReturnValue(false);

      const result = await service.deliverWithBackoff(
        endpoint,
        'payment.failed',
        {},
        MAX_DELIVERY_ATTEMPTS,
      );

      expect(result.errorCode).toBe('NETWORK_ERROR');
    });

    it('stamps lastAttemptAt on every attempt', async () => {
      const endpoint = mockEndpoint();
      (mockedAxios.post as jest.Mock).mockResolvedValue({
        status: 200,
        data: '',
      });

      const result = await service.deliverWithBackoff(
        endpoint,
        'payment.received',
        {},
      );

      expect(result.lastAttemptAt).toBeInstanceOf(Date);
    });

    it('records the correct attemptCount on each delivery row', async () => {
      const endpoint = mockEndpoint();
      (mockedAxios.post as jest.Mock).mockResolvedValue({
        status: 200,
        data: '',
      });

      await service.deliverWithBackoff(endpoint, 'payment.received', {}, 3);

      const created = deliveryRepository.create.mock.calls[0][0];
      expect(created.attemptCount).toBe(3);
    });
  });

  // ── getDeliveryForUser ─────────────────────────────────────────────────────

  describe('getDeliveryForUser', () => {
    it('returns the delivery when it belongs to the endpoint owned by the user', async () => {
      const endpoint = mockEndpoint();
      const delivery = mockDelivery();
      endpointRepository.findOne.mockResolvedValue(endpoint);
      deliveryRepository.findOne.mockResolvedValue(delivery);

      const result = await service.getDeliveryForUser(
        'user-1',
        'endpoint-1',
        'delivery-1',
      );

      expect(result).toBe(delivery);
      expect(deliveryRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'delivery-1', endpointId: 'endpoint-1' },
      });
    });

    it('throws NotFoundException when the delivery does not exist', async () => {
      endpointRepository.findOne.mockResolvedValue(mockEndpoint());
      deliveryRepository.findOne.mockResolvedValue(null);

      await expect(
        service.getDeliveryForUser('user-1', 'endpoint-1', 'missing'),
      ).rejects.toThrow('Webhook delivery not found');
    });

    it('throws NotFoundException when the endpoint is not owned by the user', async () => {
      endpointRepository.findOne.mockResolvedValue(null);

      await expect(
        service.getDeliveryForUser('user-1', 'missing-endpoint', 'delivery-1'),
      ).rejects.toThrow('Webhook endpoint not found');
    });
  });
});
