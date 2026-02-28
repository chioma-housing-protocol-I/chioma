import { Test, TestingModule } from '@nestjs/testing';
import { PropertiesController } from './properties.controller';
import { PropertiesService } from './properties.service';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { QueryPropertyDto } from './dto/query-property.dto';
import {
  Property,
  PropertyType,
  ListingStatus,
} from './entities/property.entity';
import { User, UserRole, AuthMethod } from '../users/entities/user.entity';
import { KycStatus } from '../kyc/kyc.entity';

describe('PropertiesController', () => {
  let controller: PropertiesController;

  const mockUser: User = {
    id: 'user-id',
    email: 'landlord@example.com',
    password: 'hashedPassword',
    firstName: 'Test',
    lastName: 'Landlord',
    phoneNumber: null,
    avatarUrl: null,
    role: UserRole.LANDLORD,
    emailVerified: true,
    verificationToken: null,
    resetToken: null,
    resetTokenExpires: null,
    failedLoginAttempts: 0,
    accountLockedUntil: null,
    lastLoginAt: new Date(),
    isActive: true,
    walletAddress: null,
    authMethod: AuthMethod.PASSWORD,
    refreshToken: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    kycStatus: KycStatus.PENDING,
  };

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
    ownerId: 'user-id',
    owner: mockUser,
    images: [],
    amenities: [],
    rentalUnits: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPaginatedResponse = {
    data: [mockProperty],
    total: 1,
    page: 1,
    limit: 10,
  };

  const mockPropertiesService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    findOnePublic: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    publish: jest.fn(),
    archive: jest.fn(),
    markAsRented: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PropertiesController],
      providers: [
        {
          provide: PropertiesService,
          useValue: mockPropertiesService,
        },
      ],
    }).compile();

    controller = module.get<PropertiesController>(PropertiesController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new property', async () => {
      const createDto: CreatePropertyDto = {
        title: 'New Property',
        price: 2000,
        type: PropertyType.APARTMENT,
      };

      mockPropertiesService.create.mockResolvedValue(mockProperty);

      const result = await controller.create(createDto, mockUser);

      expect(result).toEqual(mockProperty);
      expect(mockPropertiesService.create).toHaveBeenCalledWith(
        createDto,
        mockUser.id,
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated properties', async () => {
      const query: QueryPropertyDto = { page: 1, limit: 10 };

      mockPropertiesService.findAll.mockResolvedValue(mockPaginatedResponse);

      const result = await controller.findAll(query);

      expect(result).toEqual(mockPaginatedResponse);
      expect(mockPropertiesService.findAll).toHaveBeenCalledWith({
        ...query,
        status: ListingStatus.PUBLISHED,
      });
    });

    it('should default to published status for public access', async () => {
      const query: QueryPropertyDto = {};

      mockPropertiesService.findAll.mockResolvedValue(mockPaginatedResponse);

      await controller.findAll(query);

      expect(mockPropertiesService.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ status: ListingStatus.PUBLISHED }),
      );
    });
  });

  describe('findMyProperties', () => {
    it('should return user properties', async () => {
      const query: QueryPropertyDto = { page: 1, limit: 10 };

      mockPropertiesService.findAll.mockResolvedValue(mockPaginatedResponse);

      const result = await controller.findMyProperties(query, mockUser);

      expect(result).toEqual(mockPaginatedResponse);
      expect(mockPropertiesService.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ ownerId: mockUser.id }),
      );
    });
  });

  describe('findOne', () => {
    it('should return a property by id', async () => {
      mockPropertiesService.findOnePublic.mockResolvedValue(mockProperty);

      const result = await controller.findOne('property-id');

      expect(result).toEqual(mockProperty);
      expect(mockPropertiesService.findOnePublic).toHaveBeenCalledWith(
        'property-id',
      );
    });
  });

  describe('update', () => {
    it('should update a property', async () => {
      const updateDto: UpdatePropertyDto = { title: 'Updated Title' };
      const updatedProperty = { ...mockProperty, title: 'Updated Title' };

      mockPropertiesService.update.mockResolvedValue(updatedProperty);

      const result = await controller.update(
        'property-id',
        updateDto,
        mockUser,
      );

      expect(result.title).toBe('Updated Title');
      expect(mockPropertiesService.update).toHaveBeenCalledWith(
        'property-id',
        updateDto,
        mockUser,
      );
    });
  });

  describe('remove', () => {
    it('should delete a property', async () => {
      mockPropertiesService.remove.mockResolvedValue(undefined);

      await controller.remove('property-id', mockUser);

      expect(mockPropertiesService.remove).toHaveBeenCalledWith(
        'property-id',
        mockUser,
      );
    });
  });

  describe('publish', () => {
    it('should publish a property', async () => {
      const publishedProperty = {
        ...mockProperty,
        status: ListingStatus.PUBLISHED,
      };

      mockPropertiesService.publish.mockResolvedValue(publishedProperty);

      const result = await controller.publish('property-id', mockUser);

      expect(result.status).toBe(ListingStatus.PUBLISHED);
      expect(mockPropertiesService.publish).toHaveBeenCalledWith(
        'property-id',
        mockUser,
      );
    });
  });

  describe('archive', () => {
    it('should archive a property', async () => {
      const archivedProperty = {
        ...mockProperty,
        status: ListingStatus.ARCHIVED,
      };

      mockPropertiesService.archive.mockResolvedValue(archivedProperty);

      const result = await controller.archive('property-id', mockUser);

      expect(result.status).toBe(ListingStatus.ARCHIVED);
      expect(mockPropertiesService.archive).toHaveBeenCalledWith(
        'property-id',
        mockUser,
      );
    });
  });

  describe('markAsRented', () => {
    it('should mark a property as rented', async () => {
      const rentedProperty = { ...mockProperty, status: ListingStatus.RENTED };

      mockPropertiesService.markAsRented.mockResolvedValue(rentedProperty);

      const result = await controller.markAsRented('property-id', mockUser);

      expect(result.status).toBe(ListingStatus.RENTED);
      expect(mockPropertiesService.markAsRented).toHaveBeenCalledWith(
        'property-id',
        mockUser,
      );
    });
  });
});
