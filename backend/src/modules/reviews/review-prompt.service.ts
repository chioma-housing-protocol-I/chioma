import { Injectable } from '@nestjs/common';

@Injectable()
export class ReviewPromptService {
  async promptForLeaseReview(_agreementId: string) {
    // Fetch agreement, notify tenant and landlord to review each other
    // Implementation: send notification or create review prompt record
  }

  async promptForMaintenanceReview(_maintenanceId: string) {
    // Fetch maintenance request, notify tenant and landlord to review each other
    // Implementation: send notification or create review prompt record
  }
}
