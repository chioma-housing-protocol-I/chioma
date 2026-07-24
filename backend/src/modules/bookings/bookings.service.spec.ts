import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BookingsService } from './bookings.service';
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

  const mockProperty = {
    id: 'property-1',
    ownerId: 'host-1',
    price: '100.00',
    currency: 'USD',
  } as unknown as Property;

  const mockQueryBuilder = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
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
            createQueryBuilder: jest.fn(() => mockQueryBuilder),
          },
        },
        {
          provide: getRepositoryToken(Property),
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(BookingsService);
    bookingRepository = module.get(getRepositoryToken(Booking));
    propertyRepository = module.get(getRepositoryToken(Property));
    jest.clearAllMocks();
    mockQueryBuilder.leftJoinAndSelect.mockReturnThis();
    mockQueryBuilder.orderBy.mockReturnThis();
    mockQueryBuilder.where.mockReturnThis();
    mockQueryBuilder.andWhere.mockReturnThis();
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
  });

  describe('findForUser', () => {
    it('scopes to guest_id by default', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);

      await service.findForUser('guest-1', {});

      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'booking.guestId = :userId',
        { userId: 'guest-1' },
      );
    });

    it('scopes to property owner when role=host', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);

      await service.findForUser('host-1', { role: BookingRoleFilter.HOST });

      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'property.ownerId = :userId',
        { userId: 'host-1' },
      );
    });

    it('filters by status when provided', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);

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
});
