import { Test, TestingModule } from '@nestjs/testing';
import { ReviewsService } from './reviews.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Review } from './review.entity';
import { Repository } from 'typeorm';

describe('ReviewsService', () => {
  let service: ReviewsService;
  let repo: Repository<Review>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewsService,
        {
          provide: getRepositoryToken(Review),
          useClass: Repository,
        },
      ],
    }).compile();

    service = module.get<ReviewsService>(ReviewsService);
    repo = module.get<Repository<Review>>(getRepositoryToken(Review));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('calculates average rating for user', async () => {
    jest.spyOn(repo, 'createQueryBuilder').mockReturnValueOnce({
      select: () => ({
        where: () => ({
          getRawOne: async () => ({ avg: '4.5' }),
        }),
      }),
    } as any);
    const avg = await service.getAverageRatingForUser('user1');
    expect(avg).toBe(4.5);
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
});
