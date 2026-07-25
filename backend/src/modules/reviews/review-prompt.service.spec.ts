import { ReviewPromptService } from './review-prompt.service';

describe('ReviewPromptService', () => {
  let service: ReviewPromptService;

  beforeEach(() => {
    service = new ReviewPromptService();
  });

  it('exposes lease review prompt entry point', async () => {
    await expect(
      service.promptForLeaseReview('agreement-1'),
    ).resolves.toBeUndefined();
  });

  it('exposes maintenance review prompt entry point', async () => {
    await expect(
      service.promptForMaintenanceReview('maintenance-1'),
    ).resolves.toBeUndefined();
  });
});
