import { ReviewPromptService } from './review-prompt.service';
import { ReviewContext } from './review.entity';

describe('ReviewPromptService', () => {
  const reviewPromptRepo = {
    findOne: jest.fn(),
    insert: jest.fn(),
  };
  const agreementRepo = {
    findOne: jest.fn(),
  };
  const maintenanceRepo = {
    findOne: jest.fn(),
  };
  const notificationsService = {
    notify: jest.fn(),
  };

  let service: ReviewPromptService;

  beforeEach(() => {
    jest.clearAllMocks();
    reviewPromptRepo.findOne.mockResolvedValue(null);
    reviewPromptRepo.insert.mockResolvedValue(undefined);
    notificationsService.notify.mockResolvedValue(undefined);
    service = new ReviewPromptService(
      reviewPromptRepo as never,
      agreementRepo as never,
      maintenanceRepo as never,
      notificationsService as never,
    );
  });

  describe('promptForLeaseReview', () => {
    it('notifies both tenant and landlord referencing the agreement', async () => {
      agreementRepo.findOne.mockResolvedValue({
        id: 'agreement-1',
        agreementNumber: 'CHIOMA-2026-0001',
        userId: 'tenant-1',
        adminId: 'landlord-1',
      });

      await service.promptForLeaseReview('agreement-1');

      expect(reviewPromptRepo.insert).toHaveBeenCalledWith({
        context: ReviewContext.LEASE,
        sourceId: 'agreement-1',
      });
      expect(notificationsService.notify).toHaveBeenCalledTimes(2);
      expect(notificationsService.notify).toHaveBeenCalledWith(
        'tenant-1',
        expect.any(String),
        expect.stringContaining('CHIOMA-2026-0001'),
        'review_prompt_lease',
      );
      expect(notificationsService.notify).toHaveBeenCalledWith(
        'landlord-1',
        expect.any(String),
        expect.stringContaining('CHIOMA-2026-0001'),
        'review_prompt_lease',
      );
    });

    it('does not re-prompt when a prompt was already recorded for this agreement', async () => {
      reviewPromptRepo.findOne.mockResolvedValue({
        id: 'prompt-1',
        context: ReviewContext.LEASE,
        sourceId: 'agreement-1',
      });

      await service.promptForLeaseReview('agreement-1');

      expect(reviewPromptRepo.insert).not.toHaveBeenCalled();
      expect(agreementRepo.findOne).not.toHaveBeenCalled();
      expect(notificationsService.notify).not.toHaveBeenCalled();
    });

    it('skips notifying when the agreement cannot be found', async () => {
      agreementRepo.findOne.mockResolvedValue(null);

      await service.promptForLeaseReview('missing-agreement');

      expect(notificationsService.notify).not.toHaveBeenCalled();
    });
  });

  describe('promptForMaintenanceReview', () => {
    it('notifies both tenant and landlord referencing the maintenance ticket', async () => {
      maintenanceRepo.findOne.mockResolvedValue({
        id: 'request-1',
        category: 'plumbing',
        tenantId: 'tenant-1',
        landlordId: 'landlord-1',
      });

      await service.promptForMaintenanceReview('request-1');

      expect(reviewPromptRepo.insert).toHaveBeenCalledWith({
        context: ReviewContext.MAINTENANCE,
        sourceId: 'request-1',
      });
      expect(notificationsService.notify).toHaveBeenCalledTimes(2);
      expect(notificationsService.notify).toHaveBeenCalledWith(
        'tenant-1',
        expect.any(String),
        expect.stringContaining('plumbing'),
        'review_prompt_maintenance',
      );
      expect(notificationsService.notify).toHaveBeenCalledWith(
        'landlord-1',
        expect.any(String),
        expect.stringContaining('plumbing'),
        'review_prompt_maintenance',
      );
    });

    it('does not re-prompt when a prompt was already recorded for this ticket', async () => {
      reviewPromptRepo.findOne.mockResolvedValue({
        id: 'prompt-1',
        context: ReviewContext.MAINTENANCE,
        sourceId: 'request-1',
      });

      await service.promptForMaintenanceReview('request-1');

      expect(reviewPromptRepo.insert).not.toHaveBeenCalled();
      expect(maintenanceRepo.findOne).not.toHaveBeenCalled();
      expect(notificationsService.notify).not.toHaveBeenCalled();
    });

    it('skips notifying when the maintenance request cannot be found', async () => {
      maintenanceRepo.findOne.mockResolvedValue(null);

      await service.promptForMaintenanceReview('missing-request');

      expect(notificationsService.notify).not.toHaveBeenCalled();
    });
  });

  it('does not let one failed notification stop the other from being attempted', async () => {
    agreementRepo.findOne.mockResolvedValue({
      id: 'agreement-1',
      agreementNumber: 'CHIOMA-2026-0001',
      userId: 'tenant-1',
      adminId: 'landlord-1',
    });
    notificationsService.notify.mockRejectedValueOnce(new Error('boom'));
    notificationsService.notify.mockResolvedValueOnce(undefined);

    await expect(
      service.promptForLeaseReview('agreement-1'),
    ).resolves.toBeUndefined();

    expect(notificationsService.notify).toHaveBeenCalledTimes(2);
  });
});
