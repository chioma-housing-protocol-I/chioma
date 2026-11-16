/**
 * Snapshot test for POST /bookings (#2044).
 *
 * See properties.controller.snapshot.spec.ts for the broader rationale.
 * Booking.create() (bookings.service.ts) returns the saved entity with
 * only flat columns and propertyId/guestId foreign-key strings, no
 * loaded `property`/`guest` relations, so unlike GET /properties this
 * response has no User-relation-leak risk to additionally guard against
 * here; BookingsController already has ClassSerializerInterceptor
 * applied for its other endpoints that do load relations (findForUser).
 */
import { Test, TestingModule } from '@nestjs/testing';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import {
  Booking,
  BookingStatus,
  BookingPaymentMethod,
} from './entities/booking.entity';
import { User, UserRole, AuthMethod } from '../users/entities/user.entity';
import { KycStatus } from '../kyc/kyc-status.enum';
import { CreateBookingDto } from './dto/create-booking.dto';

const FIXED_DATE = new Date('2026-01-01T00:00:00.000Z');

describe('BookingsController (response shape snapshot, #2044)', () => {
  let controller: BookingsController;

  const mockUser: User = {
    id: 'guest-id',
    email: 'guest@example.com',
    password: 'hashedPassword',
    firstName: 'Test',
    lastName: 'Guest',
    phoneNumber: null,
    avatarUrl: null,
    role: UserRole.USER,
    emailVerified: true,
    verificationToken: null,
    verificationTokenExpires: null,
    resetToken: null,
    resetTokenExpires: null,
    failedLoginAttempts: 0,
    accountLockedUntil: null,
    lastLoginAt: FIXED_DATE,
    isActive: true,
    walletAddress: null,
    authMethod: AuthMethod.PASSWORD,
    refreshToken: null,
    createdAt: FIXED_DATE,
    updatedAt: FIXED_DATE,
    kycStatus: KycStatus.PENDING,
    loginCount: 0,
    preferredLanguage: 'en',
    timezone: 'UTC',
    twoFactorEnabled: false,
    emailNotifications: true,
    smsNotifications: false,
    marketingOptIn: false,
  } as User;

  const mockBooking: Booking = {
    id: 'booking-id',
    propertyId: 'property-id',
    guestId: 'guest-id',
    checkInDate: '2026-08-01',
    checkOutDate: '2026-08-05',
    guests: 2,
    specialRequests: null,
    paymentMethod: BookingPaymentMethod.CARD,
    totalAmount: 1000,
    currency: 'USD',
    status: BookingStatus.PENDING,
    createdAt: FIXED_DATE,
    updatedAt: FIXED_DATE,
  } as Booking;

  const mockBookingsService = {
    create: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BookingsController],
      providers: [{ provide: BookingsService, useValue: mockBookingsService }],
    }).compile();

    controller = module.get<BookingsController>(BookingsController);
    jest.clearAllMocks();
  });

  it('POST /bookings response shape matches the snapshot', async () => {
    mockBookingsService.create.mockResolvedValue(mockBooking);

    const dto: CreateBookingDto = {
      propertyId: 'property-id',
      checkIn: '2026-08-01',
      checkOut: '2026-08-05',
      guests: 2,
    };

    const result = await controller.create(mockUser, dto);

    expect(result).toMatchSnapshot();
    expect(mockBookingsService.create).toHaveBeenCalledWith(mockUser.id, dto);
  });
});
