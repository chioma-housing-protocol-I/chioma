import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { SublettingService } from './subletting.service';
import {
  SubletRequest,
  SubletRequestStatus,
} from './entities/sublet-request.entity';
import { SubletBooking } from './entities/sublet-booking.entity';

describe('SublettingService', () => {
  const requestRepo = {
    create: jest.fn(),
    save: jest.fn(),
    findAndCount: jest.fn(),
    findOne: jest.fn(),
  };
  const bookingRepo = {
    find: jest.fn(),
    findAndCount: jest.fn(),
  };
  const agreementRepo = { findOne: jest.fn() };
  const propertyRepo = { findOne: jest.fn() };
  const notificationsService = { notify: jest.fn() };

  let service: SublettingService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new SublettingService(
      requestRepo as never,
      bookingRepo as never,
      agreementRepo as never,
      propertyRepo as never,
      notificationsService as never,
    );
  });

  it('creates a pending sublet request and notifies the landlord', async () => {
    const dto = {
      agreementId: 'agreement-1',
      startDate: '2026-06-01',
      endDate: '2026-06-10',
      reason: 'Travel',
    };
    const created = {
      agreementId: 'agreement-1',
      tenantId: 'tenant-1',
      landlordId: 'landlord-1',
    } as SubletRequest;

    agreementRepo.findOne.mockResolvedValue({
      id: 'agreement-1',
      userId: 'tenant-1',
      adminId: 'landlord-1',
      propertyId: 'property-1',
    });
    propertyRepo.findOne.mockResolvedValue({
      sublettingAllowed: true,
      sublettingMaxDaysPerYear: 30,
      sublettingTenantShare: '75',
      sublettingLandlordShare: '25',
    });
    requestRepo.create.mockReturnValue(created);
    requestRepo.save.mockResolvedValue({ id: 'request-1', ...created });

    await expect(service.requestSubletting(dto, 'tenant-1')).resolves.toEqual({
      id: 'request-1',
      ...created,
    });

    expect(requestRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        agreementId: 'agreement-1',
        tenantId: 'tenant-1',
        landlordId: 'landlord-1',
        maxDaysPerYear: 30,
        tenantShare: 75,
        landlordShare: 25,
        reason: 'Travel',
      }),
    );
    expect(notificationsService.notify).toHaveBeenCalledWith(
      'landlord-1',
      'Sublet request',
      'A tenant requested subletting approval.',
      'SUBLET_REQUEST',
    );
  });

  it('rejects missing, unauthorized, and disallowed subletting requests', async () => {
    agreementRepo.findOne.mockResolvedValueOnce(null);

    await expect(
      service.requestSubletting(
        { agreementId: 'missing', startDate: '2026-06-01', endDate: '2026-06-02' },
        'tenant-1',
      ),
    ).rejects.toThrow(NotFoundException);

    agreementRepo.findOne.mockResolvedValueOnce({
      userId: 'tenant-2',
      propertyId: 'property-1',
    });
    await expect(
      service.requestSubletting(
        { agreementId: 'agreement-1', startDate: '2026-06-01', endDate: '2026-06-02' },
        'tenant-1',
      ),
    ).rejects.toThrow(ForbiddenException);

    agreementRepo.findOne.mockResolvedValueOnce({
      userId: 'tenant-1',
      propertyId: 'property-1',
    });
    propertyRepo.findOne.mockResolvedValueOnce({ sublettingAllowed: false });
    await expect(
      service.requestSubletting(
        { agreementId: 'agreement-1', startDate: '2026-06-01', endDate: '2026-06-02' },
        'tenant-1',
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('returns landlord requests with status filter and pagination', async () => {
    requestRepo.findAndCount.mockResolvedValue([[{ id: 'request-1' }], 1]);

    await expect(
      service.getSublettingRequests(
        'landlord-1',
        SubletRequestStatus.PENDING,
        2,
        10,
      ),
    ).resolves.toEqual({
      items: [{ id: 'request-1' }],
      total: 1,
      page: 2,
      limit: 10,
    });
    expect(requestRepo.findAndCount).toHaveBeenCalledWith({
      where: { landlordId: 'landlord-1', status: SubletRequestStatus.PENDING },
      order: { createdAt: 'DESC' },
      skip: 10,
      take: 10,
    });
  });

  it('approves and denies only landlord-owned requests', async () => {
    const pending = {
      id: 'request-1',
      landlordId: 'landlord-1',
      tenantId: 'tenant-1',
      status: SubletRequestStatus.PENDING,
    } as SubletRequest;
    requestRepo.findOne.mockResolvedValue(pending);
    requestRepo.save.mockImplementation(async (value) => value);

    await expect(
      service.approveSubletting('request-1', { notes: 'Approved' }, 'landlord-1'),
    ).resolves.toMatchObject({
      status: SubletRequestStatus.APPROVED,
      landlordNotes: 'Approved',
    });
    expect(notificationsService.notify).toHaveBeenCalledWith(
      'tenant-1',
      'Sublet approved',
      'Your sublet request has been approved.',
      'SUBLET_APPROVED',
    );

    requestRepo.findOne.mockResolvedValueOnce({ ...pending, landlordId: 'other' });
    await expect(
      service.denySubletting('request-1', { reason: 'No' }, 'landlord-1'),
    ).rejects.toThrow(ForbiddenException);

    requestRepo.findOne.mockResolvedValueOnce({ ...pending });
    await expect(
      service.denySubletting('request-1', { reason: 'Calendar conflict' }, 'landlord-1'),
    ).resolves.toMatchObject({
      status: SubletRequestStatus.DENIED,
      landlordNotes: 'Calendar conflict',
    });
  });

  it('calculates tenant and landlord earnings from bookings', async () => {
    const bookings = [
      { tenantEarnings: '100.50', landlordEarnings: '25', payoutProcessed: true },
      { tenantEarnings: 50, landlordEarnings: '15.25', payoutProcessed: false },
    ] as SubletBooking[];
    bookingRepo.find.mockResolvedValue(bookings);

    await expect(service.getTenantEarnings('tenant-1')).resolves.toEqual({
      totalEarnings: 150.5,
      pendingEarnings: 50,
      paidEarnings: 100.5,
      bookingCount: 2,
    });
    await expect(service.getLandlordEarnings('landlord-1')).resolves.toEqual({
      totalEarnings: 40.25,
      pendingEarnings: 15.25,
      paidEarnings: 25,
      bookingCount: 2,
    });
  });
});
