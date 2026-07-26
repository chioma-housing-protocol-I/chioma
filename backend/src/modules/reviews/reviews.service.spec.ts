import { Test, TestingModule } from '@nestjs/testing';
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
  let agreementRepo: jest.Mocked<Pick<Repository<RentAgreement>, 'findOne'>>;

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
