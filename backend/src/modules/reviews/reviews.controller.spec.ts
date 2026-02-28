import { Test, TestingModule } from '@nestjs/testing';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { ReviewContext } from './review.entity';

describe('ReviewsController', () => {
  let controller: ReviewsController;
  let service: ReviewsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReviewsController],
      providers: [
        {
          provide: ReviewsService,
          useValue: {
            create: jest.fn(),
            getUserReviews: jest.fn(),
            getPropertyReviews: jest.fn(),
            reportReview: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ReviewsController>(ReviewsController);
    service = module.get<ReviewsService>(ReviewsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call create on service', async () => {
    const dto: CreateReviewDto = {
      revieweeId: 'b',
      context: ReviewContext.LEASE,
      rating: 5,
    };
    const req = { user: { id: 'a' } };
    const created = { id: '1', ...dto, reviewerId: 'a' };
    (service.create as jest.Mock).mockResolvedValue(created);
    expect(await controller.createReview(dto, req)).toEqual(created);
    expect(service.create).toHaveBeenCalledWith(
      expect.objectContaining({
        revieweeId: 'b',
        context: ReviewContext.LEASE,
        rating: 5,
        reviewerId: 'a',
      }),
    );
  });
});
