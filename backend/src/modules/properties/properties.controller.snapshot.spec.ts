/**
 * Snapshot tests for GET /properties and GET /properties/:id (#2044).
 *
 * These exist to catch an unintentional shape change in the API
 * response (a field renamed, removed, or a new field silently added)
 * that unit tests asserting individual fields can miss. All date/time
 * fields are frozen to a fixed value so the snapshot is deterministic
 * across runs; a real response's actual timestamps obviously vary.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import * as request from 'supertest';
import { PropertiesController } from './properties.controller';
import { PropertiesService } from './properties.service';
import {
  Property,
  PropertyType,
  ListingStatus,
  PropertyRentalMode,
  CancellationPolicy,
} from './entities/property.entity';
import { User, UserRole, AuthMethod } from '../users/entities/user.entity';
import { KycStatus } from '../kyc/kyc-status.enum';
import { QueryPropertyDto } from './dto/query-property.dto';

const FIXED_DATE = new Date('2026-01-01T00:00:00.000Z');

describe('PropertiesController (response shape snapshots, #2044)', () => {
  let controller: PropertiesController;

  const mockOwner: User = {
    id: 'owner-id',
    email: 'landlord@example.com',
    password: 'hashedPassword',
    firstName: 'Test',
    lastName: 'Landlord',
    phoneNumber: null,
    avatarUrl: null,
    role: UserRole.ADMIN,
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

  const mockProperty: Property = {
    id: 'property-id',
    title: 'Test Property',
    description: 'A test property',
    type: PropertyType.APARTMENT,
    status: ListingStatus.PUBLISHED,
    latitude: 40.7128,
    longitude: -74.006,
    address: '123 Test St',
    city: 'New York',
    state: 'NY',
    postalCode: '10001',
    country: 'USA',
    price: 2500,
    currency: 'USD',
    bedrooms: 2,
    bathrooms: 1,
    area: 85,
    floor: 3,
    isFurnished: true,
    hasParking: true,
    petsAllowed: false,
    metadata: {},
    ownerId: 'owner-id',
    owner: mockOwner,
    images: [],
    amenities: [],
    rentalUnits: [],
    viewCount: 0,
    favoriteCount: 0,
    lastViewedAt: null,
    verificationStatus: null,
    virtualTourUrl: null,
    videoUrl: null,
    floorPlanUrl: null,
    energyRating: null,
    petPolicy: null,
    parkingSpaces: null,
    rentalMode: PropertyRentalMode.LONG_TERM,
    minStayDays: 1,
    maxStayDays: null,
    nightlyRate: null,
    weeklyDiscount: 0,
    monthlyDiscount: 0,
    cleaningFee: 0,
    extraGuestFee: 0,
    maxGuests: 4,
    instantBooking: false,
    requireGuestVerification: true,
    minimumGuestRating: 0,
    cancellationPolicy: CancellationPolicy.MODERATE,
    checkInTime: '15:00',
    checkOutTime: '11:00',
    checkInMethod: 'lockbox',
    sublettingAllowed: false,
    sublettingApprovalRequired: true,
    sublettingMaxDaysPerYear: 90,
    sublettingTenantShare: 60,
    sublettingLandlordShare: 30,
    smokingAllowed: false,
    partiesAllowed: false,
    childrenAllowed: true,
    aiPricingSuggestion: null,
    aiOptimalMode: null,
    aiOccupancyPrediction: null,
    createdAt: FIXED_DATE,
    updatedAt: FIXED_DATE,
    deletedAt: null,
  } as Property;

  const mockPropertiesService = {
    findAll: jest.fn(),
    findOnePublic: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PropertiesController],
      providers: [
        { provide: PropertiesService, useValue: mockPropertiesService },
      ],
    }).compile();

    controller = module.get<PropertiesController>(PropertiesController);
    jest.clearAllMocks();
  });

  it('GET /properties response shape matches the snapshot', async () => {
    mockPropertiesService.findAll.mockResolvedValue({
      data: [mockProperty],
      total: 1,
      page: 1,
      limit: 10,
    });

    const query = new QueryPropertyDto();
    const result = await controller.findAll(query);

    expect(result).toMatchSnapshot();
  });

  it('GET /properties/:id response shape matches the snapshot', async () => {
    mockPropertiesService.findOnePublic.mockResolvedValue(mockProperty);

    const result = await controller.findOne('property-id');

    expect(result).toMatchSnapshot();
  });
});

describe('PropertiesController (full Nest pipeline, serialization, #2044)', () => {
  // The tests above call the controller method directly, which never
  // runs through Nest's interceptor pipeline — @UseInterceptors
  // (ClassSerializerInterceptor) only fires for a real HTTP request.
  // These tests boot a real (DB-less) Nest application so the fix this
  // PR makes to PropertiesController (adding ClassSerializerInterceptor
  // so User's @Exclude()-decorated fields, like password, don't leak
  // through the owner relation) is actually exercised, not just
  // asserted against a mock that bypasses the pipeline that caused the
  // bug in the first place.
  let app: INestApplication;

  const PROPERTY_UUID = '11111111-1111-4111-8111-111111111111';

  // plainToInstance, not a plain object literal: class-transformer's
  // @Exclude() (and ClassSerializerInterceptor, which relies on it) only
  // strips fields from real class instances, not plain objects that
  // happen to satisfy the User type via `as User`. TypeORM's own
  // repository methods return real entity instances, so this fixture
  // needs to match that or the test would pass/fail for the wrong
  // reason regardless of whether the interceptor is actually wired.
  // ignoreDecorators: true — this fixture must simulate what TypeORM's
  // repository actually hands the controller: a real User instance with
  // every column populated, @Exclude() or not. If plainToInstance were
  // allowed to apply @Exclude() here too, the password would already be
  // gone before the controller/interceptor ever ran, and this test would
  // pass whether or not ClassSerializerInterceptor is wired, silently
  // testing nothing.
  const mockOwner: User = plainToInstance(
    User,
    {
      id: 'owner-id',
      email: 'landlord@example.com',
      password: 'hashedPassword',
      firstName: 'Test',
      lastName: 'Landlord',
      phoneNumber: null,
      avatarUrl: null,
      role: UserRole.ADMIN,
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
      refreshToken: 'some-refresh-token',
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
    },
    { ignoreDecorators: true },
  );

  const mockPropertyWithOwner: Property = plainToInstance(
    Property,
    {
      id: PROPERTY_UUID,
      title: 'Test Property',
      description: 'A test property',
      type: PropertyType.APARTMENT,
      status: ListingStatus.PUBLISHED,
      price: 2500,
      currency: 'USD',
      ownerId: 'owner-id',
      owner: mockOwner,
      images: [],
      amenities: [],
      rentalUnits: [],
      createdAt: FIXED_DATE,
      updatedAt: FIXED_DATE,
    },
    { ignoreDecorators: true },
  );

  const mockPropertiesService = {
    findAll: jest.fn(),
    findOnePublic: jest.fn(),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [PropertiesController],
      providers: [
        { provide: PropertiesService, useValue: mockPropertiesService },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /properties/:id does not leak the owner password hash or refresh token', async () => {
    mockPropertiesService.findOnePublic.mockResolvedValue(
      mockPropertyWithOwner,
    );

    const response = await request(app.getHttpServer())
      .get(`/properties/${PROPERTY_UUID}`)
      .expect(200);

    expect(response.body.owner).toBeDefined();
    expect(response.body.owner.password).toBeUndefined();
    expect(response.body.owner.refreshToken).toBeUndefined();
    expect(response.body.owner.email).toBe('landlord@example.com');
  });

  it('GET /properties does not leak the owner password hash on list responses', async () => {
    mockPropertiesService.findAll.mockResolvedValue({
      data: [mockPropertyWithOwner],
      total: 1,
      page: 1,
      limit: 10,
    });

    const response = await request(app.getHttpServer())
      .get('/properties')
      .expect(200);

    expect(response.body.data[0].owner.password).toBeUndefined();
  });
});
