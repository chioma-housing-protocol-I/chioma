import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { Review } from './review.entity';
import { CreateReviewDto } from './dto/create-review.dto';

@ApiTags('Reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a review',
    description:
      'Submit a review for a user (e.g. landlord/tenant) in a given context (LEASE, MAINTENANCE).',
  })
  @ApiResponse({ status: 201, description: 'Review created' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  async createReview(
    @Body() body: CreateReviewDto,
    @Req() req: { user?: { id: string } },
  ): Promise<Review> {
    const payload = {
      ...body,
      reviewerId: req.user?.id ?? '',
    };
    return this.reviewsService.create(payload as Partial<Review>);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get reviews for a user' })
  @ApiParam({ name: 'userId', description: 'User ID (reviewee)' })
  @ApiResponse({ status: 200, description: 'List of reviews' })
  async getUserReviews(@Param('userId') userId: string): Promise<Review[]> {
    return this.reviewsService.getUserReviews(userId);
  }

  @Get('property/:propertyId')
  @ApiOperation({ summary: 'Get reviews for a property' })
  @ApiParam({ name: 'propertyId', description: 'Property ID' })
  @ApiResponse({ status: 200, description: 'List of reviews' })
  async getPropertyReviews(
    @Param('propertyId') propertyId: string,
  ): Promise<Review[]> {
    return this.reviewsService.getPropertyReviews(propertyId);
  }

  @Post('report/:reviewId')
  @ApiOperation({
    summary: 'Report a review',
    description: 'Flag a review for moderation (e.g. inappropriate content).',
  })
  @ApiParam({ name: 'reviewId', description: 'Review ID' })
  @ApiResponse({
    status: 200,
    description: 'Review reported',
    schema: { type: 'object', properties: { success: { type: 'boolean' } } },
  })
  async reportReview(
    @Param('reviewId') reviewId: string,
  ): Promise<{ success: boolean }> {
    await this.reviewsService.reportReview(reviewId);
    return { success: true };
  }
}
