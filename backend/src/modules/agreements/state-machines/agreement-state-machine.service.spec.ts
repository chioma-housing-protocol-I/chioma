import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import {
  AgreementStateService,
  AGREEMENT_STATE_TRANSITIONS,
  StateTransitionError,
} from './agreement-state-machine.service';
import { AgreementStatus } from '../../rent/entities/rent-contract.entity';

describe('AgreementStateService', () => {
  let service: AgreementStateService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AgreementStateService],
    }).compile();

    service = module.get<AgreementStateService>(AgreementStateService);
  });

  describe('State Transition Matrix', () => {
    it('should define transitions for all agreement statuses', () => {
      const allStatuses = Object.values(AgreementStatus);
      allStatuses.forEach((status) => {
        expect(AGREEMENT_STATE_TRANSITIONS).toHaveProperty(status);
      });
    });

    it('should have valid state transitions', () => {
      Object.entries(AGREEMENT_STATE_TRANSITIONS).forEach(
        ([from, toStates]) => {
          expect(Array.isArray(toStates)).toBe(true);
          toStates.forEach((toState) => {
            expect(Object.values(AgreementStatus)).toContain(toState);
          });
        },
      );
    });
  });

  describe('validateTransition', () => {
    describe('valid transitions', () => {
      it('should allow DRAFT → PENDING_DEPOSIT', () => {
        expect(() =>
          service.validateTransition(
            AgreementStatus.DRAFT,
            AgreementStatus.PENDING_DEPOSIT,
          ),
        ).not.toThrow();
      });

      it('should allow PENDING_DEPOSIT → SIGNED', () => {
        expect(() =>
          service.validateTransition(
            AgreementStatus.PENDING_DEPOSIT,
            AgreementStatus.SIGNED,
          ),
        ).not.toThrow();
      });

      it('should allow SIGNED → ACTIVE', () => {
        expect(() =>
          service.validateTransition(
            AgreementStatus.SIGNED,
            AgreementStatus.ACTIVE,
          ),
        ).not.toThrow();
      });

      it('should allow ACTIVE → EXPIRED', () => {
        expect(() =>
          service.validateTransition(
            AgreementStatus.ACTIVE,
            AgreementStatus.EXPIRED,
          ),
        ).not.toThrow();
      });

      it('should allow ACTIVE → TERMINATED', () => {
        expect(() =>
          service.validateTransition(
            AgreementStatus.ACTIVE,
            AgreementStatus.TERMINATED,
          ),
        ).not.toThrow();
      });

      it('should allow ACTIVE → DISPUTED', () => {
        expect(() =>
          service.validateTransition(
            AgreementStatus.ACTIVE,
            AgreementStatus.DISPUTED,
          ),
        ).not.toThrow();
      });

      it('should allow DISPUTED → ACTIVE (dispute resolved in tenant favor)', () => {
        expect(() =>
          service.validateTransition(
            AgreementStatus.DISPUTED,
            AgreementStatus.ACTIVE,
          ),
        ).not.toThrow();
      });

      it('should allow DISPUTED → TERMINATED (dispute resolved in landlord favor)', () => {
        expect(() =>
          service.validateTransition(
            AgreementStatus.DISPUTED,
            AgreementStatus.TERMINATED,
          ),
        ).not.toThrow();
      });
    });

    describe('invalid transitions', () => {
      it('should reject DRAFT → ACTIVE (skipping steps)', () => {
        expect(() =>
          service.validateTransition(
            AgreementStatus.DRAFT,
            AgreementStatus.ACTIVE,
          ),
        ).toThrow(ConflictException);
      });

      it('should reject DRAFT → TERMINATED (invalid start)', () => {
        expect(() =>
          service.validateTransition(
            AgreementStatus.DRAFT,
            AgreementStatus.TERMINATED,
          ),
        ).toThrow(ConflictException);
      });

      it('should reject PENDING_DEPOSIT → ACTIVE (skipping SIGNED)', () => {
        expect(() =>
          service.validateTransition(
            AgreementStatus.PENDING_DEPOSIT,
            AgreementStatus.ACTIVE,
          ),
        ).toThrow(ConflictException);
      });

      it('should reject SIGNED → EXPIRED (must go through ACTIVE)', () => {
        expect(() =>
          service.validateTransition(
            AgreementStatus.SIGNED,
            AgreementStatus.EXPIRED,
          ),
        ).toThrow(ConflictException);
      });

      it('should reject ACTIVE → DRAFT (backwards transition)', () => {
        expect(() =>
          service.validateTransition(
            AgreementStatus.ACTIVE,
            AgreementStatus.DRAFT,
          ),
        ).toThrow(ConflictException);
      });

      it('should reject ACTIVE → PENDING_DEPOSIT (backwards transition)', () => {
        expect(() =>
          service.validateTransition(
            AgreementStatus.ACTIVE,
            AgreementStatus.PENDING_DEPOSIT,
          ),
        ).toThrow(ConflictException);
      });

      it('should reject ACTIVE → SIGNED (backwards transition)', () => {
        expect(() =>
          service.validateTransition(
            AgreementStatus.ACTIVE,
            AgreementStatus.SIGNED,
          ),
        ).toThrow(ConflictException);
      });

      it('should reject EXPIRED → ACTIVE (terminal state cannot revert)', () => {
        expect(() =>
          service.validateTransition(
            AgreementStatus.EXPIRED,
            AgreementStatus.ACTIVE,
          ),
        ).toThrow(ConflictException);
      });

      it('should reject EXPIRED → TERMINATED (terminal state no transitions)', () => {
        expect(() =>
          service.validateTransition(
            AgreementStatus.EXPIRED,
            AgreementStatus.TERMINATED,
          ),
        ).toThrow(ConflictException);
      });

      it('should reject TERMINATED → ACTIVE (terminal state cannot revert)', () => {
        expect(() =>
          service.validateTransition(
            AgreementStatus.TERMINATED,
            AgreementStatus.ACTIVE,
          ),
        ).toThrow(ConflictException);
      });

      it('should reject TERMINATED → EXPIRED (terminal state no transitions)', () => {
        expect(() =>
          service.validateTransition(
            AgreementStatus.TERMINATED,
            AgreementStatus.EXPIRED,
          ),
        ).toThrow(ConflictException);
      });

      it('should reject DISPUTED → DRAFT (invalid resolution path)', () => {
        expect(() =>
          service.validateTransition(
            AgreementStatus.DISPUTED,
            AgreementStatus.DRAFT,
          ),
        ).toThrow(ConflictException);
      });

      it('should reject DISPUTED → EXPIRED (invalid resolution path)', () => {
        expect(() =>
          service.validateTransition(
            AgreementStatus.DISPUTED,
            AgreementStatus.EXPIRED,
          ),
        ).toThrow(ConflictException);
      });
    });

    describe('same state transitions', () => {
      it('should throw when transitioning to same state (not in matrix)', () => {
        expect(() =>
          service.validateTransition(
            AgreementStatus.DRAFT,
            AgreementStatus.DRAFT,
          ),
        ).toThrow(StateTransitionError);
      });
    });

    describe('error messages', () => {
      it('should include current status, attempted status, and allowed transitions in error', () => {
        try {
          service.validateTransition(
            AgreementStatus.DRAFT,
            AgreementStatus.ACTIVE,
          );
          fail('Should have thrown');
        } catch (error) {
          expect(error.message).toContain(AgreementStatus.DRAFT);
          expect(error.message).toContain(AgreementStatus.ACTIVE);
          expect(error.message).toContain('Allowed');
        }
      });
    });
  });

  describe('getAvailableTransitions', () => {
    it('should return PENDING_DEPOSIT for DRAFT', () => {
      const transitions = service.getAvailableTransitions(
        AgreementStatus.DRAFT,
      );
      expect(transitions).toContain(AgreementStatus.PENDING_DEPOSIT);
      expect(transitions.length).toBe(1);
    });

    it('should return SIGNED for PENDING_DEPOSIT', () => {
      const transitions = service.getAvailableTransitions(
        AgreementStatus.PENDING_DEPOSIT,
      );
      expect(transitions).toContain(AgreementStatus.SIGNED);
      expect(transitions.length).toBe(1);
    });

    it('should return ACTIVE for SIGNED', () => {
      const transitions = service.getAvailableTransitions(
        AgreementStatus.SIGNED,
      );
      expect(transitions).toContain(AgreementStatus.ACTIVE);
      expect(transitions.length).toBe(1);
    });

    it('should return multiple transitions for ACTIVE', () => {
      const transitions = service.getAvailableTransitions(
        AgreementStatus.ACTIVE,
      );
      expect(transitions).toContain(AgreementStatus.EXPIRED);
      expect(transitions).toContain(AgreementStatus.TERMINATED);
      expect(transitions).toContain(AgreementStatus.DISPUTED);
      expect(transitions.length).toBe(3);
    });

    it('should return empty array for EXPIRED (terminal)', () => {
      const transitions = service.getAvailableTransitions(
        AgreementStatus.EXPIRED,
      );
      expect(transitions).toEqual([]);
    });

    it('should return empty array for TERMINATED (terminal)', () => {
      const transitions = service.getAvailableTransitions(
        AgreementStatus.TERMINATED,
      );
      expect(transitions).toEqual([]);
    });

    it('should return ACTIVE and TERMINATED for DISPUTED', () => {
      const transitions = service.getAvailableTransitions(
        AgreementStatus.DISPUTED,
      );
      expect(transitions).toContain(AgreementStatus.ACTIVE);
      expect(transitions).toContain(AgreementStatus.TERMINATED);
      expect(transitions.length).toBe(2);
    });
  });

  describe('transition', () => {
    it('should update agreement status for valid transition', () => {
      const agreement = { status: AgreementStatus.DRAFT };
      const changed = service.transition(
        agreement,
        AgreementStatus.PENDING_DEPOSIT,
      );

      expect(changed).toBe(true);
      expect(agreement.status).toBe(AgreementStatus.PENDING_DEPOSIT);
    });

    it('should return false for same state (no change since not in matrix)', () => {
      const agreement = { status: AgreementStatus.DRAFT };
      expect(() =>
        service.transition(agreement, AgreementStatus.DRAFT),
      ).toThrow(StateTransitionError);
      expect(agreement.status).toBe(AgreementStatus.DRAFT);
    });

    it('should throw for invalid transition', () => {
      const agreement = { status: AgreementStatus.DRAFT };
      expect(() =>
        service.transition(agreement, AgreementStatus.ACTIVE),
      ).toThrow(ConflictException);
      expect(agreement.status).toBe(AgreementStatus.DRAFT);
    });

    it('should handle complex transition chain', () => {
      const agreement = { status: AgreementStatus.DRAFT };

      service.transition(agreement, AgreementStatus.PENDING_DEPOSIT);
      expect(agreement.status).toBe(AgreementStatus.PENDING_DEPOSIT);

      service.transition(agreement, AgreementStatus.SIGNED);
      expect(agreement.status).toBe(AgreementStatus.SIGNED);

      service.transition(agreement, AgreementStatus.ACTIVE);
      expect(agreement.status).toBe(AgreementStatus.ACTIVE);

      service.transition(agreement, AgreementStatus.DISPUTED);
      expect(agreement.status).toBe(AgreementStatus.DISPUTED);

      service.transition(agreement, AgreementStatus.TERMINATED);
      expect(agreement.status).toBe(AgreementStatus.TERMINATED);
    });
  });

  describe('transition matrix completeness', () => {
    it('should have no unreachable states from DRAFT', () => {
      const reachable = new Set<AgreementStatus>();
      const queue = [AgreementStatus.DRAFT];

      while (queue.length > 0) {
        const current = queue.shift()!;
        if (reachable.has(current)) continue;

        reachable.add(current);
        const transitions = service.getAvailableTransitions(current);
        queue.push(...transitions);
      }

      // All non-terminal states should be reachable
      expect(reachable).toContain(AgreementStatus.DRAFT);
      expect(reachable).toContain(AgreementStatus.PENDING_DEPOSIT);
      expect(reachable).toContain(AgreementStatus.SIGNED);
      expect(reachable).toContain(AgreementStatus.ACTIVE);
      expect(reachable).toContain(AgreementStatus.DISPUTED);
    });

    it('should allow reaching terminal states', () => {
      // EXPIRED is reachable: DRAFT → PENDING_DEPOSIT → SIGNED → ACTIVE → EXPIRED
      expect(service.getAvailableTransitions(AgreementStatus.ACTIVE)).toContain(
        AgreementStatus.EXPIRED,
      );

      // TERMINATED is reachable: DRAFT → ... → ACTIVE → TERMINATED
      expect(service.getAvailableTransitions(AgreementStatus.ACTIVE)).toContain(
        AgreementStatus.TERMINATED,
      );
    });
  });
});
