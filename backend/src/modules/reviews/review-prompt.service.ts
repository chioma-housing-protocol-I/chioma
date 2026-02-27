import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { ReviewsService } from '../reviews/reviews.service';
import { MaintenanceService } from '../maintenance/maintenance.service';
import { AgreementsService } from '../agreements/agreements.service';

@Injectable()
export class ReviewPromptService {
  constructor(
    private readonly reviewsService: ReviewsService,
    @Inject(forwardRef(() => MaintenanceService))
    private readonly maintenanceService: MaintenanceService,
    @Inject(forwardRef(() => AgreementsService))
    private readonly agreementsService: AgreementsService,
  ) {}

  async promptForLeaseReview(_agreementId: string) {
    // Fetch agreement, notify tenant and landlord to review each other
    // Implementation: send notification or create review prompt record
  }

  async promptForMaintenanceReview(_maintenanceId: string) {
    // Fetch maintenance request, notify tenant and landlord to review each other
    // Implementation: send notification or create review prompt record
  }
}
