import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Review } from './review.entity';
import { ReviewsService } from './reviews.service';
import { ReviewsController } from './reviews.controller';
import { ReviewPromptService } from '../reviews/review-prompt.service';
import { ReviewPrompt } from './entities/review-prompt.entity';
import { GuestReview } from './entities/guest-review.entity';
import { HostReview } from './entities/host-review.entity';
import { RentAgreement } from '../rent/entities/rent-contract.entity';
import { MaintenanceRequest } from '../maintenance/maintenance-request.entity';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Review,
      GuestReview,
      HostReview,
      RentAgreement,
      MaintenanceRequest,
      ReviewPrompt,
    ]),
    NotificationsModule,
  ],
  providers: [ReviewsService, ReviewPromptService],
  controllers: [ReviewsController],
  exports: [ReviewsService, ReviewPromptService],
})
export class ReviewsModule {}
