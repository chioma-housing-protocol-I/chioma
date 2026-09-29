import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  RentAgreementService,
  AGREEMENT_STATE_TRANSITIONS,
} from './rent-agreement.service';
import { RentAgreement, AgreementStatus } from '../entities/rent-contract.entity';
import { AgreementNotFoundError } from '../../../common/errors/domain-errors';
import { InvalidStateTransitionError } from '../../../common/errors/domain-errors';

const PERFORMER = 'user-abc-123';

function makeAgreement(status: AgreementStatus): RentAgreement {
  const a = new RentAgreement();
  a.id = 'agr-1';
  a.status = status;
  return a;
}

describe('RentAgreementService', () => {
  let service: RentAgreementService;
  let repo: jest.Mocked<Repository<RentAgreement>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RentAgreementService,
        {
          provide: getRepositoryToken(RentAgreement),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(RentAgreementService);
    repo = module.get(getRepositoryToken(RentAgreement));
  });

  afterEach(() => jest.clearAllMocks());

  // ── validateTransition ───────────────────────────────────────────────────

  describe('validateTransition', () => {
    describe('valid transitions', () => {
      const cases: [AgreementStatus, AgreementStatus][] = [
        [AgreementStatus.DRAFT, AgreementStatus.PENDING_DEPOSIT],
        [AgreementStatus.PENDING_DEPOSIT, AgreementStatus.SIGNED],
        [AgreementStatus.PENDING_DEPOSIT, AgreementStatus.TERMINATED],
        [AgreementStatus.SIGNED, AgreementStatus.ACTIVE],
        [AgreementStatus.SIGNED, AgreementStatus.TERMINATED],
        [AgreementStatus.ACTIVE, AgreementStatus.EXPIRED],
        [AgreementStatus.ACTIVE, AgreementStatus.TERMINATED],
        [AgreementStatus.ACTIVE, AgreementStatus.DISPUTED],
        [AgreementStatus.DISPUTED, AgreementStatus.ACTIVE],
        [AgreementStatus.DISPUTED, AgreementStatus.TERMINATED],
      ];

      it.each(cases)('%s → %s does not throw', (from, to) => {
        expect(() => service.validateTransition(from, to)).not.toThrow();
      });
    });

    describe('invalid transitions', () => {
      const cases: [AgreementStatus, AgreementStatus][] = [
        // Terminal states cannot go anywhere
        [AgreementStatus.EXPIRED, AgreementStatus.ACTIVE],
        [AgreementStatus.EXPIRED, AgreementStatus.DRAFT],
        [AgreementStatus.TERMINATED, AgreementStatus.ACTIVE],
        [AgreementStatus.TERMINATED, AgreementStatus.DRAFT],
        // Cannot skip steps
        [AgreementStatus.DRAFT, AgreementStatus.ACTIVE],
        [AgreementStatus.DRAFT, AgreementStatus.SIGNED],
        // The critical case from the issue: rejected → active equivalent
        [AgreementStatus.EXPIRED, AgreementStatus.SIGNED],
        [AgreementStatus.TERMINATED, AgreementStatus.SIGNED],
        // Cannot go backwards
        [AgreementStatus.ACTIVE, AgreementStatus.DRAFT],
        [AgreementStatus.ACTIVE, AgreementStatus.PENDING_DEPOSIT],
        [AgreementStatus.SIGNED, AgreementStatus.DRAFT],
        [AgreementStatus.DISPUTED, AgreementStatus.DRAFT],
      ];

      it.each(cases)('%s → %s throws InvalidStateTransitionError', (from, to) => {
        expect(() => service.validateTransition(from, to)).toThrow(
          InvalidStateTransitionError,
        );
      });

      it('error message contains from/to states', () => {
        expect(() =>
          service.validateTransition(AgreementStatus.EXPIRED, AgreementStatus.ACTIVE),
        ).toThrow(/expired.*active/i);
      });

      it('error context includes allowedTransitions', () => {
        try {
          service.validateTransition(AgreementStatus.TERMINATED, AgreementStatus.ACTIVE);
        } catch (err) {
          expect(err).toBeInstanceOf(InvalidStateTransitionError);
          expect((err as InvalidStateTransitionError).context).toMatchObject({
            from: AgreementStatus.TERMINATED,
            to: AgreementStatus.ACTIVE,
            allowedTransitions: AGREEMENT_STATE_TRANSITIONS[AgreementStatus.TERMINATED],
          });
        }
      });
    });
  });

  // ── transitionStatus ─────────────────────────────────────────────────────

  describe('transitionStatus', () => {
    it('throws AgreementNotFoundError when agreement does not exist', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(
        service.transitionStatus('missing-id', AgreementStatus.ACTIVE, {
          performedBy: PERFORMER,
        }),
      ).rejects.toThrow(AgreementNotFoundError);
    });

    it('throws InvalidStateTransitionError for invalid transition', async () => {
      repo.findOne.mockResolvedValue(makeAgreement(AgreementStatus.EXPIRED));
      await expect(
        service.transitionStatus('agr-1', AgreementStatus.ACTIVE, {
          performedBy: PERFORMER,
        }),
      ).rejects.toThrow(InvalidStateTransitionError);
    });

    it('saves the agreement with the new status', async () => {
      const agreement = makeAgreement(AgreementStatus.SIGNED);
      repo.findOne.mockResolvedValue(agreement);
      repo.save.mockResolvedValue({ ...agreement, status: AgreementStatus.ACTIVE });

      const result = await service.transitionStatus(
        'agr-1',
        AgreementStatus.ACTIVE,
        { performedBy: PERFORMER },
      );

      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: AgreementStatus.ACTIVE }),
      );
      expect(result.status).toBe(AgreementStatus.ACTIVE);
    });

    it('sets terminationDate and terminationReason on TERMINATED transition', async () => {
      const agreement = makeAgreement(AgreementStatus.ACTIVE);
      repo.findOne.mockResolvedValue(agreement);
      repo.save.mockImplementation(async (a) => a as RentAgreement);

      await service.transitionStatus('agr-1', AgreementStatus.TERMINATED, {
        performedBy: PERFORMER,
        terminationReason: 'Non-payment',
      });

      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: AgreementStatus.TERMINATED,
          terminationReason: 'Non-payment',
          terminationDate: expect.any(Date),
        }),
      );
    });
  });

  // ── convenience methods ──────────────────────────────────────────────────

  describe('submitForDeposit', () => {
    it('transitions DRAFT → PENDING_DEPOSIT', async () => {
      const agreement = makeAgreement(AgreementStatus.DRAFT);
      repo.findOne.mockResolvedValue(agreement);
      repo.save.mockImplementation(async (a) => a as RentAgreement);

      await service.submitForDeposit('agr-1', { performedBy: PERFORMER });

      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: AgreementStatus.PENDING_DEPOSIT }),
      );
    });
  });

  describe('markAsSigned', () => {
    it('transitions PENDING_DEPOSIT → SIGNED', async () => {
      const agreement = makeAgreement(AgreementStatus.PENDING_DEPOSIT);
      repo.findOne.mockResolvedValue(agreement);
      repo.save.mockImplementation(async (a) => a as RentAgreement);

      await service.markAsSigned('agr-1', { performedBy: PERFORMER });

      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: AgreementStatus.SIGNED }),
      );
    });
  });

  describe('activate', () => {
    it('transitions SIGNED → ACTIVE', async () => {
      const agreement = makeAgreement(AgreementStatus.SIGNED);
      repo.findOne.mockResolvedValue(agreement);
      repo.save.mockImplementation(async (a) => a as RentAgreement);

      await service.activate('agr-1', { performedBy: PERFORMER });

      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: AgreementStatus.ACTIVE }),
      );
    });
  });

  describe('expire', () => {
    it('transitions ACTIVE → EXPIRED', async () => {
      const agreement = makeAgreement(AgreementStatus.ACTIVE);
      repo.findOne.mockResolvedValue(agreement);
      repo.save.mockImplementation(async (a) => a as RentAgreement);

      await service.expire('agr-1', { performedBy: PERFORMER });

      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: AgreementStatus.EXPIRED }),
      );
    });
  });

  describe('terminate', () => {
    it('transitions ACTIVE → TERMINATED', async () => {
      const agreement = makeAgreement(AgreementStatus.ACTIVE);
      repo.findOne.mockResolvedValue(agreement);
      repo.save.mockImplementation(async (a) => a as RentAgreement);

      await service.terminate('agr-1', {
        performedBy: PERFORMER,
        terminationReason: 'Lease break',
      });

      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: AgreementStatus.TERMINATED }),
      );
    });

    it('rejects terminating an already-EXPIRED agreement', async () => {
      repo.findOne.mockResolvedValue(makeAgreement(AgreementStatus.EXPIRED));
      await expect(
        service.terminate('agr-1', { performedBy: PERFORMER }),
      ).rejects.toThrow(InvalidStateTransitionError);
    });
  });

  describe('openDispute', () => {
    it('transitions ACTIVE → DISPUTED', async () => {
      const agreement = makeAgreement(AgreementStatus.ACTIVE);
      repo.findOne.mockResolvedValue(agreement);
      repo.save.mockImplementation(async (a) => a as RentAgreement);

      await service.openDispute('agr-1', { performedBy: PERFORMER });

      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: AgreementStatus.DISPUTED }),
      );
    });
  });

  describe('resolveDispute', () => {
    it('transitions DISPUTED → ACTIVE', async () => {
      const agreement = makeAgreement(AgreementStatus.DISPUTED);
      repo.findOne.mockResolvedValue(agreement);
      repo.save.mockImplementation(async (a) => a as RentAgreement);

      await service.resolveDispute('agr-1', { performedBy: PERFORMER });

      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: AgreementStatus.ACTIVE }),
      );
    });

    it('rejects resolving a dispute on a non-DISPUTED agreement', async () => {
      repo.findOne.mockResolvedValue(makeAgreement(AgreementStatus.ACTIVE));
      await expect(
        service.resolveDispute('agr-1', { performedBy: PERFORMER }),
      ).rejects.toThrow(InvalidStateTransitionError);
    });
  });
});
