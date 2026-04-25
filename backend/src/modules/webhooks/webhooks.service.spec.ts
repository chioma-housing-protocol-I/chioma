import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { WebhooksService } from './webhooks.service';
import { WebhookEndpoint } from './entities/webhook-endpoint.entity';
import { WebhookDelivery } from './entities/webhook-delivery.entity';
import { WebhookSignatureService } from './webhook-signature.service';
import { WebhookEvent } from './webhook-event';

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
    };

    deliveryRepository = {
      create: jest.fn().mockImplementation((dto) => ({ ...dto })),
      save: jest
        .fn()
        .mockImplementation((d) => Promise.resolve({ ...d, id: 'delivery-1' })),
    };

    configService = {
      get: jest.fn().mockReturnValue('global-secret'),
    };

    mockedAxios.post = jest.fn();
    mockedAxios.isAxiosError = jest.fn().mockReturnValue(false);

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
      endpointRepository.find.mockResolvedValue([
        mockEndpoint({ isActive: false, events: ['payment.received'] }),
      ]);

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
});
