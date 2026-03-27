import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Review } from './review.entity';
import { ReviewsService } from './reviews.service';
import { ReviewsController } from './reviews.controller';
import { ReviewPromptService } from '../reviews/review-prompt.service';

@Module({
  imports: [TypeOrmModule.forFeature([Review])],
  providers: [ReviewsService, ReviewPromptService],
  controllers: [ReviewsController],
  exports: [ReviewsService, ReviewPromptService],
})
export class ReviewsModule {}
