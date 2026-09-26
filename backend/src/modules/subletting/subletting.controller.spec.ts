import { Test, TestingModule } from '@nestjs/testing';
import { SublettingController } from './subletting.controller';
import { SublettingService } from './subletting.service';
import { SubletRequestStatus } from './entities/sublet-request.entity';

describe('SublettingController', () => {
  let controller: SublettingController;
  let service: jest.Mocked<
    Pick<
      SublettingService,
      | 'requestSubletting'
      | 'getSublettingRequests'
      | 'approveSubletting'
      | 'denySubletting'
      | 'getTenantSubletBookings'
      | 'getTenantEarnings'
      | 'getLandlordEarnings'
    >
  >;

  beforeEach(async () => {
    service = {
      requestSubletting: jest.fn(),
      getSublettingRequests: jest.fn(),
      approveSubletting: jest.fn(),
      denySubletting: jest.fn(),
      getTenantSubletBookings: jest.fn(),
      getTenantEarnings: jest.fn(),
      getLandlordEarnings: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SublettingController],
      providers: [{ provide: SublettingService, useValue: service }],
    }).compile();

    controller = module.get<SublettingController>(SublettingController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('delegates a sublet request to the service with the authenticated tenant id', async () => {
    const dto = {
      agreementId: 'agreement-1',
      startDate: '2026-09-01',
      endDate: '2027-02-28',
      reason: 'Relocation',
    };
    const created = { id: 'request-1', ...dto };
    service.requestSubletting.mockResolvedValue(created as never);

    await expect(
      controller.requestSubletting(dto, { user: { id: 'tenant-1' } }),
    ).resolves.toEqual(created);
    expect(service.requestSubletting).toHaveBeenCalledWith(dto, 'tenant-1');
  });

  it('falls back to an empty user id when the request is unauthenticated', async () => {
    const dto = {
      agreementId: 'agreement-1',
      startDate: '2026-09-01',
      endDate: '2027-02-28',
    };
    service.requestSubletting.mockResolvedValue({ id: 'request-1' } as never);

    await controller.requestSubletting(dto, {});
    expect(service.requestSubletting).toHaveBeenCalledWith(dto, '');
  });

  it('delegates landlord request listing with status filter and pagination', async () => {
    const page = { items: [{ id: 'request-1' }], total: 1, page: 2, limit: 5 };
    service.getSublettingRequests.mockResolvedValue(page as never);

    await expect(
      controller.getSublettingRequests(SubletRequestStatus.PENDING, 2, 5, {
        user: { id: 'landlord-1' },
      }),
    ).resolves.toEqual(page);
    expect(service.getSublettingRequests).toHaveBeenCalledWith(
      'landlord-1',
      SubletRequestStatus.PENDING,
      2,
      5,
    );
  });

  it('delegates approval to the service with the requestId, dto, and landlord id', async () => {
    const approved = {
      id: 'request-1',
      agreementId: 'agreement-1',
      status: SubletRequestStatus.APPROVED,
    };
    service.approveSubletting.mockResolvedValue(approved as never);

    await expect(
      controller.approveSubletting(
        'request-1',
        { notes: 'Approved' },
        { user: { id: 'landlord-1' } },
      ),
    ).resolves.toEqual(approved);
    expect(service.approveSubletting).toHaveBeenCalledWith(
      'request-1',
      { notes: 'Approved' },
      'landlord-1',
    );
  });

  it('delegates denial to the service with the requestId, dto, and landlord id', async () => {
    const denied = {
      id: 'request-1',
      agreementId: 'agreement-1',
      status: SubletRequestStatus.DENIED,
    };
    service.denySubletting.mockResolvedValue(denied as never);

    await expect(
      controller.denySubletting(
        'request-1',
        { reason: 'Not permitted under lease' },
        { user: { id: 'landlord-1' } },
      ),
    ).resolves.toEqual(denied);
    expect(service.denySubletting).toHaveBeenCalledWith(
      'request-1',
      { reason: 'Not permitted under lease' },
      'landlord-1',
    );
  });

  it('delegates tenant booking listing to the service', async () => {
    const page = { items: [], total: 0, page: 1, limit: 20 };
    service.getTenantSubletBookings.mockResolvedValue(page as never);

    await expect(
      controller.getSubletBookings(1, 20, { user: { id: 'tenant-1' } }),
    ).resolves.toEqual(page);
    expect(service.getTenantSubletBookings).toHaveBeenCalledWith(
      'tenant-1',
      1,
      20,
    );
  });

  it('delegates tenant earnings lookup to the service', async () => {
    const earnings = {
      totalEarnings: 100,
      pendingEarnings: 0,
      paidEarnings: 100,
      bookingCount: 1,
    };
    service.getTenantEarnings.mockResolvedValue(earnings as never);

    await expect(
      controller.getTenantEarnings({ user: { id: 'tenant-1' } }),
    ).resolves.toEqual(earnings);
    expect(service.getTenantEarnings).toHaveBeenCalledWith('tenant-1');
  });

  it('delegates landlord earnings lookup to the service', async () => {
    const earnings = {
      totalEarnings: 50,
      pendingEarnings: 50,
      paidEarnings: 0,
      bookingCount: 2,
    };
    service.getLandlordEarnings.mockResolvedValue(earnings as never);

    await expect(
      controller.getLandlordEarnings({ user: { id: 'landlord-1' } }),
    ).resolves.toEqual(earnings);
    expect(service.getLandlordEarnings).toHaveBeenCalledWith('landlord-1');
  });
});
