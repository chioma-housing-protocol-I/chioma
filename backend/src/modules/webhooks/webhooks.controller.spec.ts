import { Test, TestingModule } from '@nestjs/testing';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';
import { CreateWebhookEndpointDto } from './dto/create-webhook-endpoint.dto';
import { UpdateWebhookEndpointDto } from './dto/update-webhook-endpoint.dto';

describe('WebhooksController', () => {
  let controller: WebhooksController;
  let service: jest.Mocked<
    Pick<
      WebhooksService,
      | 'createEndpoint'
      | 'listEndpointsForUser'
      | 'listDeliveriesForUser'
      | 'updateEndpoint'
      | 'deleteEndpoint'
      | 'triggerTestEvent'
      | 'retryDelivery'
    >
  >;

  const req = { user: { id: 'user-1' } };

  beforeEach(async () => {
    service = {
      createEndpoint: jest.fn(),
      listEndpointsForUser: jest.fn(),
      listDeliveriesForUser: jest.fn(),
      updateEndpoint: jest.fn(),
      deleteEndpoint: jest.fn(),
      triggerTestEvent: jest.fn(),
      retryDelivery: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [WebhooksController],
      providers: [{ provide: WebhooksService, useValue: service }],
    }).compile();

    controller = module.get<WebhooksController>(WebhooksController);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('delegates endpoint creation to the service, scoped to the caller', async () => {
      const dto: CreateWebhookEndpointDto = {
        url: 'https://example.com/webhook',
        events: ['payment.received'],
      };
      const created = { id: 'ep-1', ...dto };
      service.createEndpoint.mockResolvedValue(created as never);

      await expect(controller.create(req, dto)).resolves.toEqual(created);
      expect(service.createEndpoint).toHaveBeenCalledWith('user-1', dto);
    });
  });

  describe('list', () => {
    it('delegates listing to the service, scoped to the caller', async () => {
      const endpoints = [{ id: 'ep-1' }];
      service.listEndpointsForUser.mockResolvedValue(endpoints as never);

      await expect(controller.list(req)).resolves.toEqual(endpoints);
      expect(service.listEndpointsForUser).toHaveBeenCalledWith('user-1');
    });
  });

  describe('listDeliveries', () => {
    it('delegates delivery history lookup to the service', async () => {
      const deliveries = [{ id: 'del-1' }];
      service.listDeliveriesForUser.mockResolvedValue(deliveries as never);

      await expect(controller.listDeliveries(req, 'ep-1')).resolves.toEqual(
        deliveries,
      );
      expect(service.listDeliveriesForUser).toHaveBeenCalledWith(
        'user-1',
        'ep-1',
      );
    });
  });

  describe('update', () => {
    it('delegates the update to the service', async () => {
      const dto: UpdateWebhookEndpointDto = { url: 'https://new.example.com' };
      const updated = { id: 'ep-1', ...dto };
      service.updateEndpoint.mockResolvedValue(updated as never);

      await expect(controller.update(req, 'ep-1', dto)).resolves.toEqual(
        updated,
      );
      expect(service.updateEndpoint).toHaveBeenCalledWith(
        'user-1',
        'ep-1',
        dto,
      );
    });
  });

  describe('remove', () => {
    it('delegates deletion to the service and returns a success flag', async () => {
      service.deleteEndpoint.mockResolvedValue(undefined);

      await expect(controller.remove(req, 'ep-1')).resolves.toEqual({
        success: true,
      });
      expect(service.deleteEndpoint).toHaveBeenCalledWith('user-1', 'ep-1');
    });
  });

  describe('test', () => {
    it('normalizes a JSON string payload before delegating to the service', async () => {
      const delivery = { id: 'del-1', successful: true };
      service.triggerTestEvent.mockResolvedValue(delivery as never);

      await expect(
        controller.test(req, 'ep-1', {
          event: 'payment.received',
          payload: '{"amount":100}',
        }),
      ).resolves.toEqual(delivery);
      expect(service.triggerTestEvent).toHaveBeenCalledWith(
        'user-1',
        'ep-1',
        'payment.received',
        { amount: 100 },
      );
    });

    it('passes an object payload through unchanged', async () => {
      service.triggerTestEvent.mockResolvedValue({} as never);

      await controller.test(req, 'ep-1', {
        event: 'payment.received',
        payload: { amount: 50 },
      });

      expect(service.triggerTestEvent).toHaveBeenCalledWith(
        'user-1',
        'ep-1',
        'payment.received',
        { amount: 50 },
      );
    });

    it('defaults to an empty object when no payload is provided', async () => {
      service.triggerTestEvent.mockResolvedValue({} as never);

      await controller.test(req, 'ep-1', { event: 'payment.received' });

      expect(service.triggerTestEvent).toHaveBeenCalledWith(
        'user-1',
        'ep-1',
        'payment.received',
        {},
      );
    });

    it('wraps an unparsable string payload rather than dropping it', async () => {
      service.triggerTestEvent.mockResolvedValue({} as never);

      await controller.test(req, 'ep-1', {
        event: 'payment.received',
        payload: 'not json',
      });

      expect(service.triggerTestEvent).toHaveBeenCalledWith(
        'user-1',
        'ep-1',
        'payment.received',
        { raw: 'not json' },
      );
    });
  });

  describe('retry', () => {
    it('delegates redelivery of an existing delivery by id', async () => {
      const delivery = { id: 'del-2' };
      service.retryDelivery.mockResolvedValue(delivery as never);

      await expect(
        controller.retry(req, 'ep-1', { deliveryId: 'del-1' }),
      ).resolves.toEqual(delivery);
      expect(service.retryDelivery).toHaveBeenCalledWith('user-1', 'ep-1', {
        deliveryId: 'del-1',
        event: undefined,
        payload: {},
      });
    });

    it('delegates a fresh delivery attempt using event and payload', async () => {
      service.retryDelivery.mockResolvedValue({} as never);

      await controller.retry(req, 'ep-1', {
        event: 'payment.failed',
        payload: '{"amount":75}',
      });

      expect(service.retryDelivery).toHaveBeenCalledWith('user-1', 'ep-1', {
        deliveryId: undefined,
        event: 'payment.failed',
        payload: { amount: 75 },
      });
    });
  });
});
