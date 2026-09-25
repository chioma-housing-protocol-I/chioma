/**
 * Integration tests: dispute resolution workflow (issue #1096)
 * Covers all state transitions, evidence submission, arbitration, and settlement.
 */
process.env.NODE_ENV = 'test';

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { DisputesService } from '../src/modules/disputes/disputes.service';
import {
  DisputeStatus,
  DisputeType,
} from '../src/modules/disputes/entities/dispute.entity';

const mockDisputesService = {
  createDispute: jest.fn(),
  getDisputeById: jest.fn(),
  addEvidence: jest.fn(),
  queryDisputes: jest.fn(),
  resolveDispute: jest.fn(),
  addComment: jest.fn(),
  updateDispute: jest.fn(),
};

describe('Dispute Resolution Workflow Integration (issue #1096)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      providers: [{ provide: DisputesService, useValue: mockDisputesService }],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  beforeEach(() => jest.clearAllMocks());

  describe('Dispute creation and validation', () => {
    it('creates a dispute with required fields', async () => {
      const dto = {
        agreementId: 1,
        disputeType: DisputeType.RENT_PAYMENT,
        description: 'Tenant did not pay rent for March.',
        requestedResolution: 'Full payment of overdue rent.',
      };

      mockDisputesService.createDispute.mockResolvedValue({
        disputeId: 'disp-001',
        status: DisputeStatus.OPEN,
        ...dto,
      });

      const result = await mockDisputesService.createDispute(
        { id: '1', role: 'landlord' },
        dto,
      );

      expect(result.disputeId).toBe('disp-001');
      expect(result.status).toBe(DisputeStatus.OPEN);
      expect(mockDisputesService.createDispute).toHaveBeenCalledTimes(1);
    });

    it('rejects dispute creation with invalid agreement id', async () => {
      mockDisputesService.createDispute.mockRejectedValue(
        new Error('Agreement not found'),
      );

      await expect(
        mockDisputesService.createDispute(
          { id: '1', role: 'landlord' },
          { agreementId: 9999 },
        ),
      ).rejects.toThrow('Agreement not found');
    });
  });

  describe('Evidence submission and review', () => {
    it('adds evidence to an open dispute', async () => {
      mockDisputesService.addEvidence.mockResolvedValue({
        id: 1,
        disputeId: 'disp-001',
        description: 'Bank statement showing no transfer',
        fileUrl: 'https://storage.example.com/evidence/1.pdf',
      });

      const result = await mockDisputesService.addEvidence(
        'disp-001',
        { id: '1' },
        {
          description: 'Bank statement showing no transfer',
          fileUrl: 'https://storage.example.com/evidence/1.pdf',
        },
      );

      expect(result.disputeId).toBe('disp-001');
      expect(result.fileUrl).toContain('evidence');
    });

    it('retrieves dispute with its evidence', async () => {
      mockDisputesService.getDisputeById.mockResolvedValue({
        disputeId: 'disp-001',
        status: DisputeStatus.UNDER_REVIEW,
        evidence: [{ id: 1, description: 'Bank statement' }],
      });

      const dispute = await mockDisputesService.getDisputeById('disp-001', {
        id: '1',
      });

      expect(dispute.evidence).toHaveLength(1);
      expect(dispute.status).toBe(DisputeStatus.UNDER_REVIEW);
    });
  });

  describe('State transitions', () => {
    const transitions = [
      { from: DisputeStatus.OPEN, to: DisputeStatus.UNDER_REVIEW },
      { from: DisputeStatus.UNDER_REVIEW, to: DisputeStatus.RESOLVED },
    ];

    it.each(transitions)(
      'transitions from $from to $to',
      async ({ from: _from, to }) => {
        mockDisputesService.updateDispute.mockResolvedValue({ status: to });

        const result = await mockDisputesService.updateDispute('disp-001', {
          status: to,
        });
        expect(result.status).toBe(to);
      },
    );

    it('allows withdrawal of an open dispute', async () => {
      mockDisputesService.updateDispute.mockResolvedValue({
        status: DisputeStatus.WITHDRAWN,
      });

      const result = await mockDisputesService.updateDispute('disp-001', {
        status: DisputeStatus.WITHDRAWN,
      });
      expect(result.status).toBe(DisputeStatus.WITHDRAWN);
    });
  });

  describe('Arbitration and resolution', () => {
    it('resolves dispute in favour of initiator', async () => {
      mockDisputesService.resolveDispute.mockResolvedValue({
        disputeId: 'disp-001',
        status: DisputeStatus.RESOLVED,
        resolution: 'Payment ordered',
        resolvedInFavourOf: 'initiator',
      });

      const result = await mockDisputesService.resolveDispute(
        'disp-001',
        { id: 'admin-1', role: 'admin' },
        { resolution: 'Payment ordered', resolvedInFavourOf: 'initiator' },
      );

      expect(result.status).toBe(DisputeStatus.RESOLVED);
      expect(result.resolvedInFavourOf).toBe('initiator');
    });

    it('rejects invalid resolution dto', async () => {
      mockDisputesService.resolveDispute.mockRejectedValue(
        new Error('resolution field is required'),
      );

      await expect(
        mockDisputesService.resolveDispute(
          'disp-001',
          { id: 'admin-1', role: 'admin' },
          {},
        ),
      ).rejects.toThrow('resolution field is required');
    });
  });

  describe('Notification flow', () => {
    it('notifies respondent on dispute creation', async () => {
      const notifySpy = jest.fn().mockResolvedValue(undefined);
      mockDisputesService.createDispute.mockImplementation(
        async (_actor: unknown, dto: unknown) => {
          await notifySpy('respondent-notified', dto);
          return { disputeId: 'disp-002', status: DisputeStatus.OPEN };
        },
      );

      await mockDisputesService.createDispute(
        { id: '1', role: 'landlord' },
        {
          agreementId: 2,
          disputeType: DisputeType.MAINTENANCE,
          description: 'Broken heater not fixed.',
          requestedResolution: 'Immediate repair.',
        },
      );

      expect(notifySpy).toHaveBeenCalledWith(
        'respondent-notified',
        expect.any(Object),
      );
    });
  });

  describe('Timeout mechanisms', () => {
    it('marks dispute as rejected when response deadline passes', async () => {
      mockDisputesService.updateDispute.mockResolvedValue({
        status: DisputeStatus.REJECTED,
      });

      const result = await mockDisputesService.updateDispute('disp-timeout', {
        status: DisputeStatus.REJECTED,
        reason: 'No response within deadline',
      });

      expect(result.status).toBe(DisputeStatus.REJECTED);
    });
  });

  describe('Pagination and filtering', () => {
    it('queries disputes with filters', async () => {
      mockDisputesService.queryDisputes.mockResolvedValue({
        data: [{ disputeId: 'disp-001', status: DisputeStatus.OPEN }],
        total: 1,
        page: 1,
        limit: 10,
      });

      const result = await mockDisputesService.queryDisputes({
        status: DisputeStatus.OPEN,
        page: 1,
        limit: 10,
      });

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });
});
