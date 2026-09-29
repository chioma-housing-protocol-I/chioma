import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, DeepPartial, FindOneOptions, Repository } from 'typeorm';
import { BookingsService } from './bookings.service';
import { Payment } from '../payments/entities/payment.entity';
import { PaymentService } from '../payments/payment.service';
import { StellarEscrow } from '../stellar/entities/stellar-escrow.entity';
import { StellarService } from '../stellar/services/stellar.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  Booking,
  BookingStatus,
  BookingPaymentMethod,
} from './entities/booking.entity';
import { Property } from '../properties/entities/property.entity';
import { BookingRoleFilter } from './dto/query-bookings.dto';
import {
  AuthorizationError,
  BusinessRuleViolationError,
  BookingNotFoundError,
  PropertyNotFoundError,
} from '../../common/errors/domain-errors';

describe('BookingsService', () => {
  let service: BookingsService;
  let bookingRepository: jest.Mocked<Repository<Booking>>;
  let propertyRepository: jest.Mocked<Repository<Property>>;
  let notificationsService: jest.Mocked<NotificationsService>;
  let dataSource: DataSource;

  const mockProperty = {
    id: 'property-1',
    ownerId: 'host-1',
    price: '100.00',
    currency: 'USD',
  } as unknown as Property;

  const mockQueryRunner = {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    manager: {
      create: jest.fn((_entity: unknown, data: unknown) => data),
      save: jest.fn((data: unknown) => Promise.resolve(data)),
      findOne: jest.fn(),
      exists: jest.fn(),
    },
  };

  const mockQueryBuilder = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
    getManyAndCount: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingsService,
        {
          provide: getRepositoryToken(Booking),
          useValue: {
            create: jest.fn((data) => data),
            save: jest.fn((data) =>
              Promise.resolve({ id: 'booking-1', ...data }),
            ),
            findOne: jest.fn(),
            exists: jest.fn().mockResolvedValue(false),
            createQueryBuilder: jest.fn(() => mockQueryBuilder),
          },
        },
        {
          provide: getRepositoryToken(Property),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Payment),
          useValue: {
            create: jest.fn((data) => data),
            save: jest.fn((data) => Promise.resolve(data)),
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(StellarEscrow),
          useValue: {
            create: jest.fn((data) => data),
            save: jest.fn((data) => Promise.resolve(data)),
            findOne: jest.fn(),
          },
        },
        {
          provide: PaymentService,
          useValue: {
            createPayment: jest.fn(),
            chargePayment: jest.fn(),
          },
        },
        {
          provide: StellarService,
          useValue: {
            createEscrow: jest.fn(),
          },
        },
        {
          provide: NotificationsService,
          useValue: {
            notify: jest.fn(),
          },
        },
        {
          provide: DataSource,
          useValue: {
            options: { type: 'postgres' },
            createQueryRunner: jest.fn(() => mockQueryRunner),
          },
        },
      ],
    }).compile();

    service = module.get(BookingsService);
    bookingRepository = module.get(getRepositoryToken(Booking));
    propertyRepository = module.get(getRepositoryToken(Property));
    notificationsService = module.get(NotificationsService);
    dataSource = module.get(DataSource);
    jest.clearAllMocks();
    mockQueryBuilder.leftJoinAndSelect.mockReturnThis();
    mockQueryBuilder.orderBy.mockReturnThis();
    mockQueryBuilder.where.mockReturnThis();
    mockQueryBuilder.andWhere.mockReturnThis();
    bookingRepository.exists.mockResolvedValue(false);
    notificationsService.notify.mockResolvedValue({} as never);
    // The service performs booking reads/writes inside a transaction, so route
    // the query runner's manager at the same repository mocks the tests set up.
    mockQueryRunner.manager.create.mockImplementation(
      (_entity: unknown, data: DeepPartial<Booking>) =>
        bookingRepository.create(data),
    );
    mockQueryRunner.manager.save.mockImplementation(
      (data: DeepPartial<Booking>) => bookingRepository.save(data),
    );
    mockQueryRunner.manager.findOne.mockImplementation(
      (
        entity: unknown,
        options: FindOneOptions<Booking> | FindOneOptions<Property>,
      ) =>
        entity === Property
          ? propertyRepository.findOne(options as FindOneOptions<Property>)
          : bookingRepository.findOne(options as FindOneOptions<Booking>),
    );
    mockQueryRunner.manager.exists.mockImplementation(() =>
      bookingRepository.exists(),
    );
    mockQueryRunner.manager.exists.mockImplementation(
      (_entity: unknown, options: FindOneOptions<Booking>) =>
        bookingRepository.exists(options),
    );
  });

  describe('create', () => {
    it('throws when the property does not exist', async () => {
      propertyRepository.findOne.mockResolvedValue(null);

      await expect(
        service.create('guest-1', {
          propertyId: 'missing',
          checkIn: '2026-08-01',
          checkOut: '2026-08-05',
          guests: 2,
        }),
      ).rejects.toThrow(PropertyNotFoundError);
    });

    it('rejects a check-out on or before check-in', async () => {
      propertyRepository.findOne.mockResolvedValue(mockProperty);

      await expect(
        service.create('guest-1', {
          propertyId: 'property-1',
          checkIn: '2026-08-05',
          checkOut: '2026-08-05',
          guests: 2,
        }),
      ).rejects.toThrow(BusinessRuleViolationError);
    });

    it('computes totalAmount from nightly price × nights', async () => {
      propertyRepository.findOne.mockResolvedValue(mockProperty);

      const booking = await service.create('guest-1', {
        propertyId: 'property-1',
        checkIn: '2026-08-01',
        checkOut: '2026-08-05',
        guests: 2,
        paymentMethod: BookingPaymentMethod.CARD,
      });

      expect(booking.totalAmount).toBe(400);
      expect(booking.status).toBe(BookingStatus.PENDING);
      expect(bookingRepository.save).toHaveBeenCalled();
    });

    it('rejects when the pre-transaction availability check finds an overlap', async () => {
      propertyRepository.findOne.mockResolvedValue(mockProperty);
      bookingRepository.exists.mockResolvedValueOnce(true);

      await expect(
        service.create('guest-1', {
          propertyId: 'property-1',
          checkIn: '2026-08-01',
          checkOut: '2026-08-05',
          guests: 2,
        }),
      ).rejects.toThrow(BusinessRuleViolationError);

      // Rejected before a transaction was ever opened.
      expect(mockQueryRunner.startTransaction).not.toHaveBeenCalled();
    });

    it('re-checks availability under a row lock inside the transaction and rejects a race', async () => {
      propertyRepository.findOne.mockResolvedValue(mockProperty);
      // The cheap pre-check outside the transaction sees no overlap...
      bookingRepository.exists.mockResolvedValueOnce(false);
      // ...but by the time this request acquires the lock inside the
      // transaction, a concurrent request has already committed an
      // overlapping booking, so the in-transaction re-check must catch it.
      bookingRepository.exists.mockResolvedValueOnce(true);

      await expect(
        service.create('guest-1', {
          propertyId: 'property-1',
          checkIn: '2026-08-01',
          checkOut: '2026-08-05',
          guests: 2,
        }),
      ).rejects.toThrow(BusinessRuleViolationError);

      // The lock must be acquired on the property row before the
      // authoritative overlap re-check runs.
      expect(mockQueryRunner.manager.findOne).toHaveBeenCalledWith(
        Property,
        expect.objectContaining({
          where: { id: mockProperty.id },
          lock: { mode: 'pessimistic_write' },
        }),
      );
      expect(mockQueryRunner.manager.exists).toHaveBeenCalled();
      expect(mockQueryRunner.commitTransaction).not.toHaveBeenCalled();
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      // No booking should have been persisted for the losing request.
      expect(mockQueryRunner.manager.save).not.toHaveBeenCalled();
    });

    it('skips the row lock on SQLite (no row-level locking support) but still re-checks', async () => {
      (dataSource as unknown as { options: { type: string } }).options = {
        type: 'sqlite',
      };
      propertyRepository.findOne.mockResolvedValue(mockProperty);
      bookingRepository.exists.mockResolvedValue(false);

      await service.create('guest-1', {
        propertyId: 'property-1',
        checkIn: '2026-08-01',
        checkOut: '2026-08-05',
        guests: 2,
      });

      expect(mockQueryRunner.manager.findOne).toHaveBeenCalledWith(
        Property,
        expect.objectContaining({ where: { id: mockProperty.id } }),
      );
      const lockCall = mockQueryRunner.manager.findOne.mock.calls.find(
        ([entity]: [unknown]) => entity === Property,
      );
      expect(lockCall?.[1]).not.toHaveProperty('lock');
      // Reset for subsequent tests.
      (dataSource as unknown as { options: { type: string } }).options = {
        type: 'postgres',
      };
    });
  });

  describe('findForUser', () => {
    it('scopes to guest_id by default', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findForUser('guest-1', {});

      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'booking.guestId = :userId',
        { userId: 'guest-1' },
      );
    });

    it('scopes to property owner when role=host', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findForUser('host-1', { role: BookingRoleFilter.HOST });

      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'property.ownerId = :userId',
        { userId: 'host-1' },
      );
    });

    it('filters by status when provided', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findForUser('guest-1', { status: BookingStatus.PENDING });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'booking.status = :status',
        { status: BookingStatus.PENDING },
      );
    });
  });

  describe('confirm / cancel', () => {
    const pendingBooking = {
      id: 'booking-1',
      status: BookingStatus.PENDING,
      property: { ownerId: 'host-1' },
      guest: { id: 'guest-1' },
    } as Booking;

    it('throws when the booking does not exist', async () => {
      bookingRepository.findOne.mockResolvedValue(null);

      await expect(service.confirm('host-1', 'missing')).rejects.toThrow(
        BookingNotFoundError,
      );
    });

    it('rejects a caller who does not own the property', async () => {
      bookingRepository.findOne.mockResolvedValue(pendingBooking);

      await expect(
        service.confirm('someone-else', 'booking-1'),
      ).rejects.toThrow(AuthorizationError);
    });

    it('rejects transitioning a booking that is not pending', async () => {
      bookingRepository.findOne.mockResolvedValue({
        ...pendingBooking,
        status: BookingStatus.CANCELLED,
      });

      await expect(service.confirm('host-1', 'booking-1')).rejects.toThrow(
        BusinessRuleViolationError,
      );
    });

    it('confirms a pending booking owned by the caller', async () => {
      bookingRepository.findOne.mockResolvedValue({ ...pendingBooking });

      const result = await service.confirm('host-1', 'booking-1');

      expect(result.status).toBe(BookingStatus.CONFIRMED);
      expect(bookingRepository.save).toHaveBeenCalled();
    });

    it('cancels a pending booking owned by the caller', async () => {
      bookingRepository.findOne.mockResolvedValue({ ...pendingBooking });

      const result = await service.cancel('host-1', 'booking-1');

      expect(result.status).toBe(BookingStatus.CANCELLED);
    });
  });

  describe('reschedule', () => {
    const rescheduleBooking = {
      id: 'booking-1',
      propertyId: 'property-1',
      status: BookingStatus.CONFIRMED,
      checkInDate: '2026-08-01',
      checkOutDate: '2026-08-05',
      totalAmount: 400,
      guestId: 'guest-1',
      property: { ownerId: 'host-1', price: '100.00' },
      guest: { id: 'guest-1' },
    } as unknown as Booking;

    it('throws when the booking does not exist', async () => {
      bookingRepository.findOne.mockResolvedValue(null);

      await expect(
        service.reschedule('guest-1', 'missing', {
          checkIn: '2026-09-01',
          checkOut: '2026-09-05',
        }),
      ).rejects.toThrow(BookingNotFoundError);
    });

    it('rejects a caller who is not the guest on the booking', async () => {
      bookingRepository.findOne.mockResolvedValue({ ...rescheduleBooking });

      await expect(
        service.reschedule('someone-else', 'booking-1', {
          checkIn: '2026-09-01',
          checkOut: '2026-09-05',
        }),
      ).rejects.toThrow(AuthorizationError);
    });

    it('rejects rescheduling a cancelled booking', async () => {
      bookingRepository.findOne.mockResolvedValue({
        ...rescheduleBooking,
        status: BookingStatus.CANCELLED,
      });

      await expect(
        service.reschedule('guest-1', 'booking-1', {
          checkIn: '2026-09-01',
          checkOut: '2026-09-05',
        }),
      ).rejects.toThrow(BusinessRuleViolationError);
    });

    it('rejects a check-out on or before check-in', async () => {
      bookingRepository.findOne.mockResolvedValue({ ...rescheduleBooking });

      await expect(
        service.reschedule('guest-1', 'booking-1', {
          checkIn: '2026-09-05',
          checkOut: '2026-09-05',
        }),
      ).rejects.toThrow(BusinessRuleViolationError);
    });

    it('rejects new dates that conflict with another booking', async () => {
      bookingRepository.findOne.mockResolvedValue({ ...rescheduleBooking });
      bookingRepository.exists.mockResolvedValue(true);

      await expect(
        service.reschedule('guest-1', 'booking-1', {
          checkIn: '2026-09-01',
          checkOut: '2026-09-05',
        }),
      ).rejects.toThrow(BusinessRuleViolationError);
    });

    it('recalculates price and notifies the host on success', async () => {
      bookingRepository.findOne.mockResolvedValue({ ...rescheduleBooking });
      bookingRepository.exists.mockResolvedValue(false);

      const result = await service.reschedule('guest-1', 'booking-1', {
        checkIn: '2026-09-01',
        checkOut: '2026-09-08',
      });

      expect(result.checkInDate).toBe('2026-09-01');
      expect(result.checkOutDate).toBe('2026-09-08');
      expect(result.totalAmount).toBe(700);
      expect(bookingRepository.save).toHaveBeenCalled();
      expect(notificationsService.notify).toHaveBeenCalledWith(
        'host-1',
        expect.any(String),
        expect.any(String),
        'booking',
      );
    });
  });
});
