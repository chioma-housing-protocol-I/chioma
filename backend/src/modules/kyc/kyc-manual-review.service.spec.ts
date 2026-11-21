import { TimeoutError } from '../../common/errors/retry-errors';
import { UserRole } from '../users/entities/user.entity';
import { KycStatus } from './kyc-status.enum';
import {
  isKycTimeoutError,
  KycManualReviewService,
} from './kyc-manual-review.service';

describe('KYC timeout graceful degradation (#2177)', () => {
  const setup = () => {
    const kycRepository = {
      create: jest.fn((value: object) => ({ id: 'kyc-1', ...value })),
      save: jest.fn(async (value: object) => value),
    };
    const userRepository = {
      find: jest.fn().mockResolvedValue([{ id: 'admin-1' }]),
    };
    const userKycStatusService = { setStatus: jest.fn() };
    const notificationsService = { notify: jest.fn() };
    const auditService = { log: jest.fn() };
    const service = new KycManualReviewService(
      kycRepository as never,
      userRepository as never,
      userKycStatusService as never,
      notificationsService as never,
      auditService as never,
    );
    return {
      service,
      kycRepository,
      userRepository,
      userKycStatusService,
      notificationsService,
      auditService,
    };
  };

  it('recognises provider timeouts but not ordinary provider errors', () => {
    expect(isKycTimeoutError(new TimeoutError('provider timed out'))).toBe(
      true,
    );
    expect(
      isKycTimeoutError({ code: 'EXT_6002', message: 'gateway timeout' }),
    ).toBe(true);
    expect(isKycTimeoutError(new Error('invalid documents'))).toBe(false);
  });

  it('queues a timed-out user for manual review and notifies admins', async () => {
    const {
      service,
      kycRepository,
      userRepository,
      userKycStatusService,
      notificationsService,
      auditService,
    } = setup();

    const queued = await service.queueForManualReview(
      'user-1',
      { first_name: 'Jane' },
      'checksum',
      'provider timed out',
    );

    expect(queued.status).toBe(KycStatus.MANUAL_REVIEW);
    expect(kycRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        status: KycStatus.MANUAL_REVIEW,
        documentHash: 'checksum',
        reason: expect.stringContaining('provider timed out'),
      }),
    );
    expect(userKycStatusService.setStatus).toHaveBeenCalledWith(
      'user-1',
      KycStatus.MANUAL_REVIEW,
    );
    expect(userRepository.find).toHaveBeenCalledTimes(1);
    const adminQuery = userRepository.find.mock.calls[0][0] as {
      where: { role: { value: UserRole[] } };
    };
    expect(adminQuery.where.role.value).toEqual(
      expect.arrayContaining([UserRole.ADMIN, UserRole.SUPER_ADMIN]),
    );
    expect(notificationsService.notify).toHaveBeenCalledWith(
      'user-1',
      expect.any(String),
      expect.any(String),
      'KYC_MANUAL_REVIEW',
    );
    expect(notificationsService.notify).toHaveBeenCalledWith(
      'admin-1',
      expect.stringContaining('Manual review'),
      expect.any(String),
      'KYC_MANUAL_REVIEW',
    );
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({ entityId: 'kyc-1' }),
    );
  });

  it('still queues the user when no admins are configured', async () => {
    const { service, userRepository, notificationsService } = setup();
    userRepository.find.mockResolvedValue([]);

    await service.queueForManualReview('user-2', {}, 'hash', 'timeout');

    expect(notificationsService.notify).toHaveBeenCalledTimes(1);
    expect(notificationsService.notify).toHaveBeenCalledWith(
      'user-2',
      expect.any(String),
      expect.any(String),
      'KYC_MANUAL_REVIEW',
    );
  });

  it('preserves a supplied provider reference for webhook correlation', async () => {
    const { service, kycRepository } = setup();

    await service.queueForManualReview(
      'user-3',
      {},
      'hash',
      'timeout',
      'provider-ref-1',
    );

    expect(kycRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ providerReference: 'provider-ref-1' }),
    );
  });
});
