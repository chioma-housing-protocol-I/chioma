import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AvailabilityService } from './availability.service';
import { PropertyAvailability } from './entities/property-availability.entity';
import { Property } from './entities/property.entity';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

describe('AvailabilityService', () => {
  let service: AvailabilityService;
  let availabilityRepo: Repository<PropertyAvailability>;
  let _propertyRepo: Repository<Property>;

  const mockAvailabilityRepo = {
    find: jest.fn(),
    upsert: jest.fn(),
    findOne: jest.fn(),
    findOneOrFail: jest.fn(),
    save: jest.fn(),
  };

  const mockPropertyRepo = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AvailabilityService,
        {
          provide: getRepositoryToken(PropertyAvailability),
          useValue: mockAvailabilityRepo,
        },
        {
          provide: getRepositoryToken(Property),
          useValue: mockPropertyRepo,
        },
      ],
    }).compile();

    service = module.get<AvailabilityService>(AvailabilityService);
    availabilityRepo = module.get<Repository<PropertyAvailability>>(
      getRepositoryToken(PropertyAvailability),
    );
    _propertyRepo = module.get<Repository<Property>>(
      getRepositoryToken(Property),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('fills missing dates with defaults in getAvailability', async () => {
    mockAvailabilityRepo.find.mockResolvedValue([
      {
        date: '2026-04-02',
        available: false,
        customPrice: 180,
        notes: 'Blocked',
        blockedByBookingId: null,
      },
    ]);

    const result = await service.getAvailability(
      'property-1',
      '2026-04-01',
      '2026-04-03',
    );

    expect(result).toEqual([
      {
        date: '2026-04-01',
        available: true,
        customPrice: null,
        notes: null,
        blockedByBookingId: null,
      },
      {
        date: '2026-04-02',
        available: false,
        customPrice: 180,
        notes: 'Blocked',
        blockedByBookingId: null,
      },
      {
        date: '2026-04-03',
        available: true,
        customPrice: null,
        notes: null,
        blockedByBookingId: null,
      },
    ]);
  });

  it('updates availability for a date range', async () => {
    mockPropertyRepo.findOne.mockResolvedValue({
      id: 'property-1',
      ownerId: 'owner-1',
    });

    const result = await service.updateAvailability(
      'property-1',
      {
        startDate: '2026-04-01',
        endDate: '2026-04-03',
        available: false,
      },
      'owner-1',
    );

    expect(availabilityRepo.upsert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          propertyId: 'property-1',
          date: '2026-04-01',
          available: false,
        }),
        expect.objectContaining({
          propertyId: 'property-1',
          date: '2026-04-02',
          available: false,
        }),
        expect.objectContaining({
          propertyId: 'property-1',
          date: '2026-04-03',
          available: false,
        }),
      ]),
      ['propertyId', 'date'],
    );
    expect(result).toEqual({ success: true, updatedDates: 3 });
  });

  it('throws NotFoundException when property does not exist', async () => {
    mockPropertyRepo.findOne.mockResolvedValue(null);

    await expect(
      service.blockDates(
        'missing-property',
        { dates: ['2026-04-10'] },
        'owner-1',
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it('throws ForbiddenException when non-owner updates availability', async () => {
    mockPropertyRepo.findOne.mockResolvedValue({
      id: 'property-1',
      ownerId: 'owner-1',
    });

    await expect(
      service.updateAvailability(
        'property-1',
        {
          startDate: '2026-04-01',
          endDate: '2026-04-01',
          available: false,
        },
        'owner-2',
      ),
    ).rejects.toThrow(ForbiddenException);
  });
});
