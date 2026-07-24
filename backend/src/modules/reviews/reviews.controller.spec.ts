import { Test, TestingModule } from '@nestjs/testing';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { ReviewContext } from './review.entity';

describe('ReviewsController', () => {
  let controller: ReviewsController;
  let service: jest.Mocked<
    Pick<
      ReviewsService,
      | 'create'
      | 'getUserReviews'
      | 'getPropertyReviews'
      | 'reportReview'
      | 'postGuestReview'
      | 'postHostReview'
      | 'getGuestReviews'
      | 'getHostReviews'
      | 'getReputation'
      | 'updateReview'
      | 'deleteReview'
    >
  >;

  beforeEach(async () => {
    service = {
      create: jest.fn(),
      getUserReviews: jest.fn(),
      getPropertyReviews: jest.fn(),
      reportReview: jest.fn(),
      postGuestReview: jest.fn(),
      postHostReview: jest.fn(),
      getGuestReviews: jest.fn(),
      getHostReviews: jest.fn(),
      getReputation: jest.fn(),
      updateReview: jest.fn(),
      deleteReview: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReviewsController],
      providers: [{ provide: ReviewsService, useValue: service }],
    }).compile();

    controller = module.get<ReviewsController>(ReviewsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('delegates review creation to the service', async () => {
    const dto: CreateReviewDto = {
      revieweeId: 'b',
      context: ReviewContext.LEASE,
      rating: 5,
    };
    const req = { user: { id: 'a' } };
    const created = { id: '1', ...dto, reviewerId: 'a' };
    service.create.mockResolvedValue(created as never);

    await expect(controller.createReview(dto, req)).resolves.toEqual(created);
    expect(service.create).toHaveBeenCalledWith(
      expect.objectContaining({
        revieweeId: 'b',
        context: ReviewContext.LEASE,
        rating: 5,
        reviewerId: 'a',
      }),
    );
  });

  it('delegates user review lookup to the service', async () => {
    const reviews = [{ id: 'r1' }];
    service.getUserReviews.mockResolvedValue(reviews as never);

    await expect(controller.getUserReviews('user-1')).resolves.toEqual(reviews);
    expect(service.getUserReviews).toHaveBeenCalledWith('user-1');
  });

  it('delegates property review lookup to the service', async () => {
    const reviews = [{ id: 'r2' }];
    service.getPropertyReviews.mockResolvedValue(reviews as never);

    await expect(controller.getPropertyReviews('prop-1')).resolves.toEqual(
      reviews,
    );
    expect(service.getPropertyReviews).toHaveBeenCalledWith('prop-1');
  });

  it('delegates review reporting to the service', async () => {
    service.reportReview.mockResolvedValue(undefined);

    await expect(controller.reportReview('review-1')).resolves.toEqual({
      success: true,
    });
    expect(service.reportReview).toHaveBeenCalledWith('review-1');
  });

  it('delegates guest review submission to the service', async () => {
    const dto = {
      bookingId: 'booking-1',
      cleanliness: 5,
      communication: 5,
      respectForRules: 5,
      comment: 'Great guest',
      wouldHostAgain: true,
    };
    const created = { id: 'guest-review-1', ...dto };
    service.postGuestReview.mockResolvedValue(created as never);

    await expect(
      controller.postGuestReview(dto, { user: { id: 'host-1' } }),
    ).resolves.toEqual(created);
    expect(service.postGuestReview).toHaveBeenCalledWith(dto, 'host-1');
  });

  it('delegates host review submission to the service', async () => {
    const dto = {
      bookingId: 'booking-1',
      accuracy: 5,
      cleanliness: 5,
      checkIn: 5,
      communication: 5,
      location: 5,
      value: 5,
      comment: 'Great host',
    };
    const created = { id: 'host-review-1', ...dto };
    service.postHostReview.mockResolvedValue(created as never);

    await expect(
      controller.postHostReview(dto, { user: { id: 'guest-1' } }),
    ).resolves.toEqual(created);
    expect(service.postHostReview).toHaveBeenCalledWith(dto, 'guest-1');
  });

  it('delegates guest review listing to the service', async () => {
    const paginated = { items: [], total: 0, page: 2, limit: 5 };
    service.getGuestReviews.mockResolvedValue(paginated as never);

    await expect(controller.getGuestReviews('guest-1', 2, 5)).resolves.toEqual(
      paginated,
    );
    expect(service.getGuestReviews).toHaveBeenCalledWith('guest-1', 2, 5);
  });

  it('delegates host review listing to the service', async () => {
    const paginated = { items: [], total: 0, page: 1, limit: 20 };
    service.getHostReviews.mockResolvedValue(paginated as never);

    await expect(controller.getHostReviews('host-1', 1, 20)).resolves.toEqual(
      paginated,
    );
    expect(service.getHostReviews).toHaveBeenCalledWith('host-1', 1, 20);
  });

  it('delegates reputation lookup to the service', async () => {
    const reputation = {
      asHost: {
        averageRating: 4.5,
        reviewCount: 2,
        wouldHostAgainPercentage: 50,
      },
      asGuest: { averageRating: 4, reviewCount: 1 },
    };
    service.getReputation.mockResolvedValue(reputation as never);

    await expect(controller.getReputation('user-1')).resolves.toEqual(
      reputation,
    );
    expect(service.getReputation).toHaveBeenCalledWith('user-1');
  });

  it('delegates review updates to the service', async () => {
    const updated = { id: 'review-1', comment: 'Updated' };
    service.updateReview.mockResolvedValue(updated as never);

    await expect(
      controller.updateReview(
        'review-1',
        { comment: 'Updated' },
        {
          user: { id: 'host-1' },
        },
      ),
    ).resolves.toEqual(updated);
    expect(service.updateReview).toHaveBeenCalledWith(
      'review-1',
      { comment: 'Updated' },
      'host-1',
    );
  });

  it('delegates review deletion to the service', async () => {
    service.deleteReview.mockResolvedValue({ deleted: true } as never);

    await expect(
      controller.deleteReview('review-1', { user: { id: 'guest-1' } }),
    ).resolves.toEqual({ deleted: true });
    expect(service.deleteReview).toHaveBeenCalledWith('review-1', 'guest-1');
  });
});
