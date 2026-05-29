import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { WebhooksService } from '../src/modules/webhooks/webhooks.service';
import { WebhookSignatureService } from '../src/modules/webhooks/webhook-signature.service';
import { WebhookEndpoint } from '../src/modules/webhooks/entities/webhook-endpoint.entity';
import { WebhookDelivery } from '../src/modules/webhooks/entities/webhook-delivery.entity';
import { WebhookEvent } from '../src/modules/webhooks/webhook-event';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Webhook Delivery Integration (e2e)', () => {
  let service: WebhooksService;
  let signatureService: WebhookSignatureService;

  const mockEndpoint: WebhookEndpoint = {
    id: 'endpoint-uuid-1',
    userId: 'user-1',
    url: 'https://mock.endpoint/webhook',
    events: ['payment.received', 'payment.failed'] as WebhookEvent[],
    secret: 'test-secret',
    isActive: true,
    deliveries: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockDelivery: Partial<WebhookDelivery> = {
    id: 'delivery-uuid-1',
    endpointId: 'endpoint-uuid-1',
    event: 'payment.received',
    payload: { data: 'test' },
    successful: false,
    attemptCount: 1,
  };

  const mockEndpointRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    findBy: jest.fn(),
  };

  const mockDeliveryRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [() => ({ WEBHOOK_SIGNATURE_SECRET: 'test-secret' })],
        }),
      ],
      providers: [
        WebhooksService,
        WebhookSignatureService,
        {
          provide: getRepositoryToken(WebhookEndpoint),
          useValue: mockEndpointRepository,
        },
        {
          provide: getRepositoryToken(WebhookDelivery),
          useValue: mockDeliveryRepository,
        },
      ],
    }).compile();

    service = module.get<WebhooksService>(WebhooksService);
    signatureService = module.get<WebhookSignatureService>(
      WebhookSignatureService,
    );
  });

  describe('Webhook Registration and Management', () => {
    it('dispatches events only to active matching endpoints', async () => {
      const inactiveEndpoint: WebhookEndpoint = {
        ...mockEndpoint,
        id: 'endpoint-uuid-2',
        isActive: false,
      };

      mockEndpointRepository.find.mockResolvedValue([
        mockEndpoint,
        inactiveEndpoint,
      ]);
      mockDeliveryRepository.create.mockReturnValue({ ...mockDelivery });
      mockDeliveryRepository.save.mockResolvedValue({
        ...mockDelivery,
        successful: true,
      });
      mockedAxios.post.mockResolvedValue({ status: 200, data: 'ok' });
      mockedAxios.isAxiosError.mockReturnValue(false);

      await service.dispatchEvent('payment.received', { amount: 100 });

      expect(mockedAxios.post).toHaveBeenCalledTimes(1);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        mockEndpoint.url,
        expect.any(String),
        expect.objectContaining({ headers: expect.any(Object) }),
      );
    });

    it('skips endpoints that do not subscribe to the event', async () => {
      const otherEndpoint: WebhookEndpoint = {
        ...mockEndpoint,
        events: ['dispute.created'] as WebhookEvent[],
      };

      mockEndpointRepository.find.mockResolvedValue([otherEndpoint]);
      mockDeliveryRepository.create.mockReturnValue({ ...mockDelivery });
      mockDeliveryRepository.save.mockResolvedValue({ ...mockDelivery });

      await service.dispatchEvent('payment.received', { amount: 100 });

      expect(mockedAxios.post).not.toHaveBeenCalled();
    });
  });

  describe('Event Publishing and Delivery', () => {
    it('records a successful delivery with status and timestamp', async () => {
      mockDeliveryRepository.create.mockReturnValue({ ...mockDelivery });
      const savedDelivery = {
        ...mockDelivery,
        successful: true,
        responseStatus: 200,
        deliveredAt: new Date(),
      };
      mockDeliveryRepository.save.mockResolvedValue(savedDelivery);
      mockedAxios.post.mockResolvedValue({ status: 200, data: 'ok' });
      mockedAxios.isAxiosError.mockReturnValue(false);

      const result = await service.deliverEvent(
        mockEndpoint,
        'payment.received',
        { amount: 100 },
      );

      expect(result.successful).toBe(true);
      expect(result.responseStatus).toBe(200);
      expect(result.deliveredAt).toBeDefined();
    });

    it('sends signed headers in every delivery', async () => {
      mockDeliveryRepository.create.mockReturnValue({ ...mockDelivery });
      mockDeliveryRepository.save.mockResolvedValue({ ...mockDelivery });
      mockedAxios.post.mockResolvedValue({ status: 200, data: '' });
      mockedAxios.isAxiosError.mockReturnValue(false);

      await service.deliverEvent(mockEndpoint, 'payment.received', {});

      const callArgs = mockedAxios.post.mock.calls[0];
      const headers = callArgs[2]?.headers as Record<string, string>;
      expect(headers).toHaveProperty('X-Webhook-Signature');
      expect(headers).toHaveProperty('X-Webhook-Timestamp');
    });

    it('delivers events to multiple active matching endpoints', async () => {
      const endpoint2: WebhookEndpoint = {
        ...mockEndpoint,
        id: 'endpoint-uuid-3',
        url: 'https://second.endpoint/hook',
      };

      mockEndpointRepository.find.mockResolvedValue([mockEndpoint, endpoint2]);
      mockDeliveryRepository.create.mockReturnValue({ ...mockDelivery });
      mockDeliveryRepository.save.mockResolvedValue({
        ...mockDelivery,
        successful: true,
      });
      mockedAxios.post.mockResolvedValue({ status: 200, data: '' });
      mockedAxios.isAxiosError.mockReturnValue(false);

      await service.dispatchEvent('payment.received', {});

      expect(mockedAxios.post).toHaveBeenCalledTimes(2);
    });
  });

  describe('Signature Verification', () => {
    it('generates and verifies a valid HMAC signature', () => {
      const payload = JSON.stringify({ event: 'payment.received', data: {} });
      const timestamp = Date.now().toString();
      const secret = 'my-secret';

      const signature = signatureService.generateSignature(
        payload,
        timestamp,
        secret,
      );
      expect(() =>
        signatureService.verifySignature(payload, signature, timestamp, secret),
      ).not.toThrow();
    });

    it('rejects a tampered payload', () => {
      const payload = JSON.stringify({ amount: 100 });
      const timestamp = Date.now().toString();
      const secret = 'my-secret';
      const signature = signatureService.generateSignature(
        payload,
        timestamp,
        secret,
      );

      expect(() =>
        signatureService.verifySignature(
          JSON.stringify({ amount: 999 }),
          signature,
          timestamp,
          secret,
        ),
      ).toThrow();
    });

    it('rejects an expired timestamp', () => {
      const payload = '{"ok":true}';
      const oldTimestamp = (Date.now() - 10 * 60 * 1000).toString();
      const secret = 'my-secret';
      const signature = signatureService.generateSignature(
        payload,
        oldTimestamp,
        secret,
      );

      expect(() =>
        signatureService.verifySignature(
          payload,
          signature,
          oldTimestamp,
          secret,
        ),
      ).toThrow();
    });

    it('rejects missing signature', () => {
      expect(() =>
        signatureService.verifySignature(
          '{}',
          undefined,
          Date.now().toString(),
          'secret',
        ),
      ).toThrow();
    });
  });

  describe('Failure Handling and Delivery Status', () => {
    it('records a failed delivery when endpoint returns 4xx', async () => {
      const axiosError = {
        isAxiosError: true,
        response: { status: 400, data: 'Bad Request' },
        message: 'Request failed',
      };

      mockDeliveryRepository.create.mockReturnValue({ ...mockDelivery });
      mockDeliveryRepository.save.mockResolvedValue({
        ...mockDelivery,
        successful: false,
        responseStatus: 400,
      });
      mockedAxios.post.mockRejectedValue(axiosError);
      mockedAxios.isAxiosError.mockReturnValue(true);

      const result = await service.deliverEvent(
        mockEndpoint,
        'payment.failed',
        {},
      );

      expect(result.successful).toBe(false);
      expect(result.responseStatus).toBe(400);
    });

    it('records a failed delivery when endpoint is unreachable', async () => {
      const networkError = new Error('ECONNREFUSED');

      mockDeliveryRepository.create.mockReturnValue({ ...mockDelivery });
      mockDeliveryRepository.save.mockResolvedValue({
        ...mockDelivery,
        successful: false,
        responseStatus: undefined,
      });
      mockedAxios.post.mockRejectedValue(networkError);
      mockedAxios.isAxiosError.mockReturnValue(false);

      const result = await service.deliverEvent(
        mockEndpoint,
        'payment.failed',
        {},
      );

      expect(result.successful).toBe(false);
    });

    it('saves delivery record regardless of success or failure', async () => {
      mockedAxios.post.mockRejectedValue(new Error('timeout'));
      mockedAxios.isAxiosError.mockReturnValue(false);
      mockDeliveryRepository.create.mockReturnValue({ ...mockDelivery });
      mockDeliveryRepository.save.mockResolvedValue({
        ...mockDelivery,
        successful: false,
      });

      await service.deliverEvent(mockEndpoint, 'payment.received', {});

      expect(mockDeliveryRepository.save).toHaveBeenCalledTimes(1);
    });
  });
});
