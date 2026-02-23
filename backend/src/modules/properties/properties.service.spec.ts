import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { PropertiesService } from './properties.service';
import {
  Property,
  PropertyType,
  ListingStatus,
} from './entities/property.entity';
import { PropertyImage } from './entities/property-image.entity';
import { PropertyAmenity } from './entities/property-amenity.entity';
import { RentalUnit } from './entities/rental-unit.entity';
import { User, UserRole, AuthMethod } from '../users/entities/user.entity';

describe('PropertiesService', () => {
  let service: PropertiesService;

  const mockOwner: User = {
    id: 'owner-id',
    email: 'owner@example.com',
    password: 'hashedPassword',
    firstName: 'Property',
    lastName: 'Owner',
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
  };

  const mockAdmin: User = {
    ...mockOwner,
    id: 'admin-id',
    email: 'admin@example.com',
    role: UserRole.ADMIN,
  };

  const mockOtherUser: User = {
    ...mockOwner,
    id: 'other-user-id',
    email: 'other@example.com',
    role: UserRole.TENANT,
  };

  const mockProperty: Property = {
    id: 'property-id',
    title: 'Test Property',
    description: 'A test property description',
    type: PropertyType.APARTMENT,
    status: ListingStatus.DRAFT,
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
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPropertyRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockImageRepository = {
    create: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
  };

  const mockAmenityRepository = {
    create: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
  };

  const mockRentalUnitRepository = {
    create: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
  };

  const mockCacheManager = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    store: {
      keys: jest.fn().mockResolvedValue([]),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PropertiesService,
        {
          provide: getRepositoryToken(Property),
          useValue: mockPropertyRepository,
        },
        {
          provide: getRepositoryToken(PropertyImage),
          useValue: mockImageRepository,
        },
        {
          provide: getRepositoryToken(PropertyAmenity),
          useValue: mockAmenityRepository,
        },
        {
          provide: getRepositoryToken(RentalUnit),
          useValue: mockRentalUnitRepository,
        },
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
      ],
    }).compile();

    service = module.get<PropertiesService>(PropertiesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a property successfully', async () => {
      const createDto = {
        title: 'New Property',
        price: 2000,
        type: PropertyType.APARTMENT,
      };

      mockPropertyRepository.create.mockReturnValue({
        ...createDto,
        ownerId: mockOwner.id,
        status: ListingStatus.DRAFT,
      });
      mockPropertyRepository.save.mockResolvedValue({
        id: 'new-property-id',
        ...createDto,
        ownerId: mockOwner.id,
        status: ListingStatus.DRAFT,
      });
      mockPropertyRepository.findOne.mockResolvedValue({
        id: 'new-property-id',
        ...createDto,
        ownerId: mockOwner.id,
        status: ListingStatus.DRAFT,
        images: [],
        amenities: [],
        rentalUnits: [],
      });

      const result = await service.create(createDto, mockOwner.id);

      expect(result.title).toBe('New Property');
      expect(result.status).toBe(ListingStatus.DRAFT);
      expect(mockPropertyRepository.create).toHaveBeenCalled();
      expect(mockPropertyRepository.save).toHaveBeenCalled();
    });

    it('should create a property with images', async () => {
      const createDto = {
        title: 'New Property',
        price: 2000,
        images: [{ url: 'https://example.com/img.jpg', isPrimary: true }],
      };

      mockPropertyRepository.create.mockReturnValue({
        title: createDto.title,
        price: createDto.price,
        ownerId: mockOwner.id,
        status: ListingStatus.DRAFT,
      });
      mockPropertyRepository.save.mockResolvedValue({
        id: 'new-property-id',
        title: createDto.title,
        price: createDto.price,
        ownerId: mockOwner.id,
        status: ListingStatus.DRAFT,
      });
      mockImageRepository.create.mockReturnValue({
        url: 'https://example.com/img.jpg',
        isPrimary: true,
        propertyId: 'new-property-id',
      });
      mockImageRepository.save.mockResolvedValue([]);
      mockPropertyRepository.findOne.mockResolvedValue({
        id: 'new-property-id',
        ...createDto,
        images: [{ url: 'https://example.com/img.jpg', isPrimary: true }],
      });

      await service.create(createDto, mockOwner.id);

      expect(mockImageRepository.create).toHaveBeenCalled();
      expect(mockImageRepository.save).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a property by id', async () => {
      mockPropertyRepository.findOne.mockResolvedValue(mockProperty);

      const result = await service.findOne('property-id');

      expect(result).toEqual(mockProperty);
      expect(mockPropertyRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'property-id' },
        relations: ['images', 'amenities', 'rentalUnits', 'owner'],
      });
    });

    it('should throw NotFoundException if property not found', async () => {
      mockPropertyRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findOnePublic', () => {
    it('should return a published property', async () => {
      const publishedProperty = {
        ...mockProperty,
        status: ListingStatus.PUBLISHED,
      };
      mockPropertyRepository.findOne.mockResolvedValue(publishedProperty);

      const result = await service.findOnePublic('property-id');

      expect(result.status).toBe(ListingStatus.PUBLISHED);
    });

    it('should throw NotFoundException for non-published property', async () => {
      mockPropertyRepository.findOne.mockResolvedValue(mockProperty);

      await expect(service.findOnePublic('property-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update a property by owner', async () => {
      const updateDto = { title: 'Updated Title' };
      const updatedProperty = { ...mockProperty, ...updateDto };

      mockPropertyRepository.findOne.mockResolvedValue(mockProperty);
      mockPropertyRepository.save.mockResolvedValue(updatedProperty);

      await service.update('property-id', updateDto, mockOwner);

      expect(mockPropertyRepository.save).toHaveBeenCalled();
    });

    it('should update a property by admin', async () => {
      const updateDto = { title: 'Updated by Admin' };

      mockPropertyRepository.findOne.mockResolvedValue(mockProperty);
      mockPropertyRepository.save.mockResolvedValue({
        ...mockProperty,
        ...updateDto,
      });

      await expect(
        service.update('property-id', updateDto, mockAdmin),
      ).resolves.not.toThrow();
    });

    it('should throw ForbiddenException for non-owner', async () => {
      mockPropertyRepository.findOne.mockResolvedValue(mockProperty);

      await expect(
        service.update('property-id', { title: 'Hack' }, mockOtherUser),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('remove', () => {
    it('should delete a property by owner', async () => {
      mockPropertyRepository.findOne.mockResolvedValue(mockProperty);
      mockPropertyRepository.remove.mockResolvedValue(mockProperty);

      await service.remove('property-id', mockOwner);

      expect(mockPropertyRepository.remove).toHaveBeenCalledWith(mockProperty);
    });

    it('should throw ForbiddenException for non-owner', async () => {
      mockPropertyRepository.findOne.mockResolvedValue(mockProperty);

      await expect(
        service.remove('property-id', mockOtherUser),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('publish', () => {
    it('should publish a draft property', async () => {
      const draftProperty = { ...mockProperty, status: ListingStatus.DRAFT };
      const publishedProperty = {
        ...draftProperty,
        status: ListingStatus.PUBLISHED,
      };

      mockPropertyRepository.findOne.mockResolvedValue(draftProperty);
      mockPropertyRepository.save.mockResolvedValue(publishedProperty);

      const result = await service.publish('property-id', mockOwner);

      expect(result.status).toBe(ListingStatus.PUBLISHED);
    });

    it('should throw BadRequestException if already published', async () => {
      const publishedProperty = {
        ...mockProperty,
        status: ListingStatus.PUBLISHED,
      };
      mockPropertyRepository.findOne.mockResolvedValue(publishedProperty);

      await expect(service.publish('property-id', mockOwner)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if archived', async () => {
      const archivedProperty = {
        ...mockProperty,
        status: ListingStatus.ARCHIVED,
      };
      mockPropertyRepository.findOne.mockResolvedValue(archivedProperty);

      await expect(service.publish('property-id', mockOwner)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if missing title or price', async () => {
      const incompleteProperty = {
        ...mockProperty,
        title: '',
        price: 0,
        status: ListingStatus.DRAFT,
      };
      mockPropertyRepository.findOne.mockResolvedValue(incompleteProperty);

      await expect(service.publish('property-id', mockOwner)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('archive', () => {
    it('should archive a property', async () => {
      const archivedProperty = {
        ...mockProperty,
        status: ListingStatus.ARCHIVED,
      };

      mockPropertyRepository.findOne.mockResolvedValue(mockProperty);
      mockPropertyRepository.save.mockResolvedValue(archivedProperty);

      const result = await service.archive('property-id', mockOwner);

      expect(result.status).toBe(ListingStatus.ARCHIVED);
    });

    it('should throw ForbiddenException for non-owner', async () => {
      mockPropertyRepository.findOne.mockResolvedValue(mockProperty);

      await expect(
        service.archive('property-id', mockOtherUser),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('markAsRented', () => {
    it('should mark a property as rented', async () => {
      const rentedProperty = { ...mockProperty, status: ListingStatus.RENTED };

      mockPropertyRepository.findOne.mockResolvedValue(mockProperty);
      mockPropertyRepository.save.mockResolvedValue(rentedProperty);

      const result = await service.markAsRented('property-id', mockOwner);

      expect(result.status).toBe(ListingStatus.RENTED);
    });
  });

  describe('findAll', () => {
    it('should return paginated properties', async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[mockProperty], 1]),
      };

      mockPropertyRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder,
      );

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    it('should apply filters correctly', async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };

      mockPropertyRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder,
      );

      await service.findAll({
        type: PropertyType.APARTMENT,
        minPrice: 1000,
        maxPrice: 3000,
        city: 'New York',
      });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalled();
    });

    it('should cache public listings', async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[mockProperty], 1]),
      };

      mockPropertyRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder,
      );
      mockCacheManager.get.mockResolvedValue(null);

      const query = {
        page: 1,
        limit: 10,
        status: ListingStatus.PUBLISHED,
      };
      await service.findAll(query);

      expect(mockCacheManager.set).toHaveBeenCalled();
    });

    it('should return cached data if available', async () => {
      const cachedData = { data: [mockProperty], total: 1, page: 1, limit: 10 };
      mockCacheManager.get.mockResolvedValue(cachedData);

      const result = await service.findAll({
        status: ListingStatus.PUBLISHED,
      });

      expect(result).toEqual(cachedData);
      expect(mockPropertyRepository.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('should invalidate cache on update', async () => {
      mockPropertyRepository.findOne.mockResolvedValue(mockProperty);
      mockPropertyRepository.save.mockResolvedValue(mockProperty);
      mockCacheManager.store.keys.mockResolvedValue(['properties:list:key']);

      await service.update('property-id', { title: 'Updated' }, mockOwner);

      expect(mockCacheManager.del).toHaveBeenCalledWith('properties:list:key');
    });
  });
});
