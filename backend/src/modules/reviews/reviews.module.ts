import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Review } from './review.entity';
import { ReviewsService } from './reviews.service';
import { ReviewsController } from './reviews.controller';
import { ReviewPromptService } from '../reviews/review-prompt.service';
import { AgreementsModule } from '../agreements/agreements.module';
import { MaintenanceModule } from '../maintenance/maintenance.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Review]),
    forwardRef(() => AgreementsModule),
    forwardRef(() => MaintenanceModule),
  ],
  providers: [ReviewsService, ReviewPromptService],
  controllers: [ReviewsController],
  exports: [ReviewsService, ReviewPromptService],
})
export class ReviewsModule {}
