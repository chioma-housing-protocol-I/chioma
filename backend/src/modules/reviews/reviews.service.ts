import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review } from './review.entity';
import { containsProhibitedLanguage } from './review-moderation.util';
import { GuestReview } from './entities/guest-review.entity';
import { HostReview } from './entities/host-review.entity';
import { PostGuestReviewDto } from './dto/post-guest-review.dto';
import { PostHostReviewDto } from './dto/post-host-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import {
  AgreementStatus,
  RentAgreement,
} from '../rent/entities/rent-contract.entity';
import {
  ReviewNotFoundError,
  AuthorizationError,
  ValidationError,
  BusinessRuleViolationError,
  AgreementNotFoundError,
} from '../../common/errors/domain-errors';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review)
    private readonly reviewRepository: Repository<Review>,
    @InjectRepository(GuestReview)
    private readonly guestReviewRepository: Repository<GuestReview>,
    @InjectRepository(HostReview)
    private readonly hostReviewRepository: Repository<HostReview>,
    @InjectRepository(RentAgreement)
    private readonly agreementRepository: Repository<RentAgreement>,
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

  async postGuestReview(
    dto: PostGuestReviewDto,
    hostId: string,
  ): Promise<GuestReview> {
    if (containsProhibitedLanguage(dto.comment ?? '')) {
      throw new ValidationError('Review contains prohibited language.');
    }

    const agreement = await this.agreementRepository.findOne({
      where: { id: dto.bookingId },
    });

    if (!agreement) {
      throw new AgreementNotFoundError(dto.bookingId);
    }

    if (agreement.status !== AgreementStatus.EXPIRED) {
      throw new BusinessRuleViolationError('Booking must be completed');
    }

    if (agreement.adminId !== hostId) {
      throw new AuthorizationError('Not authorized');
    }

    const existing = await this.guestReviewRepository.findOne({
      where: { bookingId: dto.bookingId, hostId },
    });

    if (existing) {
      throw new BusinessRuleViolationError('Review already posted');
    }

    const review = this.guestReviewRepository.create({
      bookingId: dto.bookingId,
      guestId: agreement.userId,
      hostId,
      cleanliness: dto.cleanliness,
      communication: dto.communication,
      respectForRules: dto.respectForRules,
      comment: dto.comment,
      wouldHostAgain: dto.wouldHostAgain,
    });

    return this.guestReviewRepository.save(review);
  }

  async postHostReview(
    dto: PostHostReviewDto,
    guestId: string,
  ): Promise<HostReview> {
    if (containsProhibitedLanguage(dto.comment ?? '')) {
      throw new ValidationError('Review contains prohibited language.');
    }

    const agreement = await this.agreementRepository.findOne({
      where: { id: dto.bookingId },
    });

    if (!agreement) {
      throw new AgreementNotFoundError(dto.bookingId);
    }

    if (agreement.status !== AgreementStatus.EXPIRED) {
      throw new BusinessRuleViolationError('Booking must be completed');
    }

    if (agreement.userId !== guestId) {
      throw new AuthorizationError('Not authorized');
    }

    const existing = await this.hostReviewRepository.findOne({
      where: { bookingId: dto.bookingId, guestId },
    });

    if (existing) {
      throw new BusinessRuleViolationError('Review already posted');
    }

    const review = this.hostReviewRepository.create({
      bookingId: dto.bookingId,
      guestId,
      hostId: agreement.adminId,
      accuracy: dto.accuracy,
      cleanliness: dto.cleanliness,
      checkIn: dto.checkIn,
      communication: dto.communication,
      location: dto.location,
      value: dto.value,
      comment: dto.comment,
    });

    return this.hostReviewRepository.save(review);
  }

  async getGuestReviews(userId: string, page = 1, limit = 20) {
    const [items, total] = await this.guestReviewRepository.findAndCount({
      where: { guestId: userId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { items, total, page, limit };
  }

  async getHostReviews(userId: string, page = 1, limit = 20) {
    const [items, total] = await this.hostReviewRepository.findAndCount({
      where: { hostId: userId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { items, total, page, limit };
  }

  async getReputation(userId: string) {
    const guestReviews = await this.guestReviewRepository.find({
      where: { hostId: userId },
    });

    const hostReviews = await this.hostReviewRepository.find({
      where: { guestId: userId },
    });

    const guestAvg =
      guestReviews.length > 0
        ? guestReviews.reduce(
            (sum, r) =>
              sum + r.cleanliness + r.communication + r.respectForRules,
            0,
          ) /
          (guestReviews.length * 3)
        : 0;

    const hostAvg =
      hostReviews.length > 0
        ? hostReviews.reduce(
            (sum, r) =>
              sum +
              r.accuracy +
              r.cleanliness +
              r.checkIn +
              r.communication +
              r.location +
              r.value,
            0,
          ) /
          (hostReviews.length * 6)
        : 0;

    return {
      asHost: {
        averageRating: Math.round(guestAvg * 10) / 10,
        reviewCount: guestReviews.length,
        wouldHostAgainPercentage:
          guestReviews.length === 0
            ? 0
            : (guestReviews.filter((r) => r.wouldHostAgain).length /
                guestReviews.length) *
              100,
      },
      asGuest: {
        averageRating: Math.round(hostAvg * 10) / 10,
        reviewCount: hostReviews.length,
      },
    };
  }

  async getMyReviews(userId: string, page = 1, limit = 20, filters: any = {}) {
    const query = this.reviewRepository
      .createQueryBuilder('review')
      .where('(review.reviewerId = :userId OR review.revieweeId = :userId)', {
        userId,
      });

    if (filters.rating) {
      query.andWhere('review.rating = :rating', { rating: filters.rating });
    }
    if (filters.status) {
      if (filters.status === 'FLAGGED') {
        query.andWhere('review.reported = :reported', { reported: true });
      } else if (filters.status === 'PUBLISHED') {
        query.andWhere('review.reported = :reported', { reported: false });
      }
    }
    if (filters.search) {
      query.andWhere('review.comment ILIKE :search', {
        search: `%${filters.search}%`,
      });
    }

    const [items, total] = await query
      .orderBy('review.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      data: items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async updateReview(id: string, dto: UpdateReviewDto, userId: string) {
    const review = await this.reviewRepository.findOne({
      where: { id },
    });
    if (review) {
      if (review.reviewerId !== userId) {
        throw new AuthorizationError('Not authorized');
      }
      Object.assign(review, dto);
      return this.reviewRepository.save(review);
    }

    const guestReview = await this.guestReviewRepository.findOne({
      where: { id },
    });
    if (guestReview) {
      if (guestReview.hostId !== userId) {
        throw new AuthorizationError('Not authorized');
      }
      Object.assign(guestReview, dto);
      return this.guestReviewRepository.save(guestReview);
    }

    const hostReview = await this.hostReviewRepository.findOne({
      where: { id },
    });
    if (hostReview) {
      if (hostReview.guestId !== userId) {
        throw new AuthorizationError('Not authorized');
      }
      Object.assign(hostReview, dto);
      return this.hostReviewRepository.save(hostReview);
    }

    throw new ReviewNotFoundError(id);
  }

  async deleteReview(id: string, userId: string) {
    const review = await this.reviewRepository.findOne({
      where: { id },
    });
    if (review) {
      if (review.reviewerId !== userId) {
        throw new AuthorizationError('Not authorized');
      }
      await this.reviewRepository.delete({ id });
      return { deleted: true };
    }

    const guestReview = await this.guestReviewRepository.findOne({
      where: { id },
    });
    if (guestReview) {
      if (guestReview.hostId !== userId) {
        throw new AuthorizationError('Not authorized');
      }
      await this.guestReviewRepository.delete({ id });
      return { deleted: true };
    }

    const hostReview = await this.hostReviewRepository.findOne({
      where: { id },
    });
    if (hostReview) {
      if (hostReview.guestId !== userId) {
        throw new AuthorizationError('Not authorized');
      }
      await this.hostReviewRepository.delete({ id });
      return { deleted: true };
    }

    throw new ReviewNotFoundError(id);
  }
}
