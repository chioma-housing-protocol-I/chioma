import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { Review } from './review.entity';
import { CreateReviewDto } from './dto/create-review.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PostGuestReviewDto } from './dto/post-guest-review.dto';
import { PostHostReviewDto } from './dto/post-host-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';

@ApiTags('Reviews')
@Controller('reviews')
@UseGuards(JwtAuthGuard)
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

  @Get()
  @ApiOperation({
    summary:
      'Get reviews for the authenticated user with pagination and filters',
  })
  async getMyReviews(
    @Req() req: { user?: { id: string } },
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('role') role?: string,
    @Query('status') status?: string,
    @Query('rating') rating?: number,
    @Query('search') search?: string,
  ) {
    return this.reviewsService.getMyReviews(
      req.user?.id ?? '',
      Number(page),
      Number(limit),
      { role, status, rating, search },
    );
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

  @Post('guest')
  async postGuestReview(
    @Body() dto: PostGuestReviewDto,
    @Req() req: { user?: { id: string } },
  ) {
    return this.reviewsService.postGuestReview(dto, req.user?.id ?? '');
  }

  @Post('host')
  async postHostReview(
    @Body() dto: PostHostReviewDto,
    @Req() req: { user?: { id: string } },
  ) {
    return this.reviewsService.postHostReview(dto, req.user?.id ?? '');
  }

  @Get('guest/:userId')
  async getGuestReviews(
    @Param('userId') userId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.reviewsService.getGuestReviews(
      userId,
      Number(page),
      Number(limit),
    );
  }

  @Get('host/:userId')
  async getHostReviews(
    @Param('userId') userId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.reviewsService.getHostReviews(
      userId,
      Number(page),
      Number(limit),
    );
  }

  @Get('reputation/:userId')
  async getReputation(@Param('userId') userId: string) {
    return this.reviewsService.getReputation(userId);
  }

  @Patch(':id')
  async updateReview(
    @Param('id') id: string,
    @Body() dto: UpdateReviewDto,
    @Req() req: { user?: { id: string } },
  ) {
    return this.reviewsService.updateReview(id, dto, req.user?.id ?? '');
  }

  @Delete(':id')
  async deleteReview(
    @Param('id') id: string,
    @Req() req: { user?: { id: string } },
  ) {
    return this.reviewsService.deleteReview(id, req.user?.id ?? '');
  }
}
