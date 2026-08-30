import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ReviewsService } from './reviews.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Review } from './review.entity';
import { GuestReview } from './entities/guest-review.entity';
import { HostReview } from './entities/host-review.entity';
import {
  AgreementStatus,
  RentAgreement,
} from '../rent/entities/rent-contract.entity';
import { Repository } from 'typeorm';
import {
  AgreementNotFoundError,
  AuthorizationError,
  BusinessRuleViolationError,
} from '../../common/errors/domain-errors';

describe('ReviewsService', () => {
  let service: ReviewsService;
  let reviewRepo: Repository<Review>;
  let guestReviewRepo: jest.Mocked<
    Pick<Repository<GuestReview>, 'findOne' | 'save' | 'create'>
  >;
  let hostReviewRepo: jest.Mocked<
    Pick<Repository<HostReview>, 'findOne' | 'save' | 'create'>
  >;
  let agreementRepo: jest.Mocked<
    Pick<Repository<RentAgreement>, 'findOne' | 'find'>
  >;
  let configService: { get: jest.Mock };

  beforeEach(async () => {
    guestReviewRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
    };
    hostReviewRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
    };
    agreementRepo = {
      findOne: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
    };
    configService = {
      get: jest.fn((_key: string, defaultValue?: unknown) => defaultValue),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewsService,
        {
          provide: getRepositoryToken(Review),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(GuestReview),
          useValue: guestReviewRepo,
        },
        {
          provide: getRepositoryToken(HostReview),
          useValue: hostReviewRepo,
        },
        {
          provide: getRepositoryToken(RentAgreement),
          useValue: agreementRepo,
        },
        {
          provide: ConfigService,
          useValue: configService,
        },
      ],
    }).compile();

    service = module.get<ReviewsService>(ReviewsService);
    reviewRepo = module.get<Repository<Review>>(getRepositoryToken(Review));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('calculates average rating for user', async () => {
    jest.spyOn(reviewRepo, 'createQueryBuilder').mockReturnValueOnce({
      select: () => ({
        where: () => ({
          getRawOne: async () => ({ avg: '4.5' }),
        }),
      }),
    } as any);
    const avg = await service.getAverageRatingForUser('user1');
    expect(avg).toBe(4.5);
  });

  it('returns zero when property has no reviews', async () => {
    jest.spyOn(reviewRepo, 'createQueryBuilder').mockReturnValueOnce({
      select: () => ({
        where: () => ({
          getRawOne: async () => ({ avg: null }),
        }),
      }),
    } as any);
    const avg = await service.getAverageRatingForProperty('property-1');
    expect(avg).toBe(0);
  });

  it('blocks prohibited language', async () => {
    await expect(
      service.create({
        reviewerId: 'a',
        revieweeId: 'b',
        rating: 5,
        comment: 'spam',
      }),
    ).rejects.toThrow('Review contains prohibited language.');
  });

  describe('create booking verification', () => {
    const daysAgo = (days: number): Date =>
      new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const expiredAgreement = (completedDaysAgo: number): RentAgreement =>
      ({
        id: 'agreement-1',
        status: AgreementStatus.EXPIRED,
        userId: 'tenant-1',
        adminId: 'landlord-1',
        propertyId: 'property-1',
        endDate: daysAgo(completedDaysAgo),
        updatedAt: daysAgo(completedDaysAgo),
      }) as RentAgreement;

    const reviewPayload = {
      reviewerId: 'tenant-1',
      revieweeId: 'landlord-1',
      propertyId: 'property-1',
      rating: 5,
      comment: 'Great landlord',
    };

    it('rejects a review without a qualifying completed booking', async () => {
      agreementRepo.find.mockResolvedValue([]);

      await expect(service.create(reviewPayload)).rejects.toThrow(
        BusinessRuleViolationError,
      );
      await expect(service.create(reviewPayload)).rejects.toThrow(
        /completed booking/i,
      );
    });

    it('accepts a review backed by a completed booking within the window', async () => {
      agreementRepo.find.mockResolvedValue([expiredAgreement(5)]);
      const created = { id: 'review-1', ...reviewPayload } as Review;
      jest.spyOn(reviewRepo, 'create').mockReturnValue(created);
      jest.spyOn(reviewRepo, 'save').mockResolvedValue(created);

      const result = await service.create(reviewPayload);

      expect(result).toBe(created);
      // Only expired agreements between the two parties qualify.
      expect(agreementRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.arrayContaining([
            expect.objectContaining({
              userId: 'tenant-1',
              adminId: 'landlord-1',
              status: AgreementStatus.EXPIRED,
              propertyId: 'property-1',
            }),
            expect.objectContaining({
              userId: 'landlord-1',
              adminId: 'tenant-1',
              status: AgreementStatus.EXPIRED,
              propertyId: 'property-1',
            }),
          ]),
        }),
      );
    });

    it('rejects a review when the booking completed outside the window', async () => {
      agreementRepo.find.mockResolvedValue([expiredAgreement(31)]);

      await expect(service.create(reviewPayload)).rejects.toThrow(
        /review window/i,
      );
    });

    it('honours a configured review window', async () => {
      configService.get.mockImplementation((key: string, def?: unknown) =>
        key === 'REVIEW_WINDOW_DAYS' ? 5 : def,
      );
      agreementRepo.find.mockResolvedValue([expiredAgreement(10)]);

      await expect(service.create(reviewPayload)).rejects.toThrow(
        /review window of 5 days/i,
      );

      agreementRepo.find.mockResolvedValue([expiredAgreement(3)]);
      const created = { id: 'review-2' } as Review;
      jest.spyOn(reviewRepo, 'create').mockReturnValue(created);
      jest.spyOn(reviewRepo, 'save').mockResolvedValue(created);

      await expect(service.create(reviewPayload)).resolves.toBe(created);
    });

    it('falls back to the default window on invalid configuration', async () => {
      configService.get.mockImplementation((key: string, def?: unknown) =>
        key === 'REVIEW_WINDOW_DAYS' ? 'not-a-number' : def,
      );
      agreementRepo.find.mockResolvedValue([expiredAgreement(5)]);
      const created = { id: 'review-3' } as Review;
      jest.spyOn(reviewRepo, 'create').mockReturnValue(created);
      jest.spyOn(reviewRepo, 'save').mockResolvedValue(created);

      await expect(service.create(reviewPayload)).resolves.toBe(created);
    });

    it('requires reviewer and reviewee ids', async () => {
      await expect(
        service.create({ revieweeId: 'landlord-1', rating: 5 }),
      ).rejects.toThrow(/reviewerId and revieweeId are required/);
    });
  });

  it('rejects guest review when the review window has closed', async () => {
    const staleDate = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000);
    agreementRepo.findOne.mockResolvedValue({
      id: 'booking-1',
      status: AgreementStatus.EXPIRED,
      userId: 'guest-1',
      adminId: 'host-1',
      endDate: staleDate,
      updatedAt: staleDate,
    } as RentAgreement);

    await expect(
      service.postGuestReview(
        {
          bookingId: 'booking-1',
          cleanliness: 5,
          communication: 5,
          respectForRules: 5,
          comment: 'Too late',
          wouldHostAgain: true,
        },
        'host-1',
      ),
    ).rejects.toThrow(/review window/i);
  });

  it('rejects host review when the review window has closed', async () => {
    const staleDate = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000);
    agreementRepo.findOne.mockResolvedValue({
      id: 'booking-1',
      status: AgreementStatus.EXPIRED,
      userId: 'guest-1',
      adminId: 'host-1',
      endDate: staleDate,
      updatedAt: staleDate,
    } as RentAgreement);

    await expect(
      service.postHostReview(
        {
          bookingId: 'booking-1',
          accuracy: 5,
          cleanliness: 5,
          checkIn: 5,
          communication: 5,
          location: 5,
          value: 5,
          comment: 'Too late',
        },
        'guest-1',
      ),
    ).rejects.toThrow(/review window/i);
  });

  it('rejects guest review when booking is missing', async () => {
    agreementRepo.findOne.mockResolvedValue(null);

    await expect(
      service.postGuestReview(
        {
          bookingId: 'missing',
          cleanliness: 5,
          communication: 5,
          respectForRules: 5,
          comment: 'Missing booking',
          wouldHostAgain: true,
        },
        'host-1',
      ),
    ).rejects.toThrow(AgreementNotFoundError);
  });

  it('rejects host review for unauthorized guest', async () => {
    agreementRepo.findOne.mockResolvedValue({
      id: 'booking-1',
      status: AgreementStatus.EXPIRED,
      userId: 'guest-1',
      adminId: 'host-1',
    } as RentAgreement);

    await expect(
      service.postHostReview(
        {
          bookingId: 'booking-1',
          accuracy: 5,
          cleanliness: 5,
          checkIn: 5,
          communication: 5,
          location: 5,
          value: 5,
          comment: 'Unauthorized',
        },
        'other-guest',
      ),
    ).rejects.toThrow(AuthorizationError);
  });

  it('rejects duplicate host reviews', async () => {
    agreementRepo.findOne.mockResolvedValue({
      id: 'booking-1',
      status: AgreementStatus.EXPIRED,
      userId: 'guest-1',
      adminId: 'host-1',
    } as RentAgreement);
    hostReviewRepo.findOne.mockResolvedValue({ id: 'existing' } as HostReview);

    await expect(
      service.postHostReview(
        {
          bookingId: 'booking-1',
          accuracy: 5,
          cleanliness: 5,
          checkIn: 5,
          communication: 5,
          location: 5,
          value: 5,
          comment: 'Duplicate',
        },
        'guest-1',
      ),
    ).rejects.toThrow(BusinessRuleViolationError);
  });
});
