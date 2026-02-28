import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review } from './review.entity';
import { containsProhibitedLanguage } from './review-moderation.util';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review)
    private readonly reviewRepository: Repository<Review>,
  ) {}

  async create(reviewData: Partial<Review>): Promise<Review> {
    if (containsProhibitedLanguage(reviewData.comment ?? '')) {
      throw new Error('Review contains prohibited language.');
    }
    const review = this.reviewRepository.create(reviewData);
    return this.reviewRepository.save(review);
  }

  async getUserReviews(userId: string): Promise<Review[]> {
    return this.reviewRepository.find({
      where: [{ reviewerId: userId }, { revieweeId: userId }],
    });
  }

  async getPropertyReviews(propertyId: string): Promise<Review[]> {
    return this.reviewRepository.find({ where: { propertyId } });
  }

  async getAverageRatingForUser(userId: string): Promise<number> {
    const { avg } = await this.reviewRepository
      .createQueryBuilder('review')
      .select('AVG(review.rating)', 'avg')
      .where('review.revieweeId = :userId', { userId })
      .getRawOne();
    return avg ? parseFloat(avg) : 0;
  }

  async getAverageRatingForProperty(propertyId: string): Promise<number> {
    const { avg } = await this.reviewRepository
      .createQueryBuilder('review')
      .select('AVG(review.rating)', 'avg')
      .where('review.propertyId = :propertyId', { propertyId })
      .getRawOne();
    return avg ? parseFloat(avg) : 0;
  }

  async reportReview(reviewId: string): Promise<void> {
    await this.reviewRepository.update(reviewId, { reported: true });
  }
}
