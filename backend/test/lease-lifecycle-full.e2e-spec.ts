/**
 * Integration test: full lease lifecycle (#1624).
 *
 * Modules are unit-tested in isolation, but the path from inquiry to booking
 * to agreement to escrow to rent schedule to termination crosses many of
 * them and previously had no coverage that exercised the sequence end to
 * end. This test walks that sequence, threading each step's output into the
 * next call the way a real user flow would, and asserts the state-machine
 * rules and cross-module data (deposit tracking, escrow balance, payment
 * history) stay consistent across the whole journey.
 *
 * Following this project's established integration-test convention (see
 * `lease-agreement-integration.e2e-spec.ts`, `contract-signing-integration.e2e-spec.ts`),
 * each module's service is exercised through a Nest `TestingModule` with its
 * own dependencies mocked at the boundary — repositories, blockchain/Stellar
 * clients, and third-party integrations. Chain interactions (escrow
 * creation/release, Stellar sync) are always stubbed; nothing here talks to
 * a real ledger. `AgreementStateService`, the actual state-machine
 * implementation `AgreementsService` uses to validate status transitions, is
 * used unmocked so the transition rules under test are real.
 */
process.env.NODE_ENV = 'test';

import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { InquiriesService } from '../src/modules/inquiries/inquiries.service';
import {
  PropertyInquiry,
  PropertyInquiryStatus,
} from '../src/modules/inquiries/entities/property-inquiry.entity';
import { NotificationsService } from '../src/modules/notifications/notifications.service';

import { BookingsService } from '../src/modules/bookings/bookings.service';
import {
  Booking,
  BookingStatus,
} from '../src/modules/bookings/entities/booking.entity';
import { Payment as BookingPayment } from '../src/modules/payments/entities/payment.entity';
import {
  StellarEscrow,
  EscrowStatus,
} from '../src/modules/stellar/entities/stellar-escrow.entity';
import { PaymentService } from '../src/modules/payments/payment.service';
import { StellarService } from '../src/modules/stellar/services/stellar.service';

import { AgreementsService } from '../src/modules/agreements/agreements.service';
import { AgreementStateService } from '../src/modules/agreements/state-machines/agreement-state-machine.service';
import { EscrowIntegrationService } from '../src/modules/agreements/escrow-integration.service';
import {
  RentAgreement,
  AgreementStatus,
} from '../src/modules/rent/entities/rent-contract.entity';
import {
  Payment as AgreementPayment,
  PaymentStatus,
} from '../src/modules/rent/entities/payment.entity';
import { AuditService } from '../src/modules/audit/audit.service';
import { ReviewPromptService } from '../src/modules/reviews/review-prompt.service';
import { ChiomaContractService } from '../src/modules/stellar/services/chioma-contract.service';
import { BlockchainSyncService } from '../src/modules/agreements/blockchain-sync.service';
import { TemplateRenderingService } from '../src/modules/agreements/template-rendering.service';
import { PDFGenerationService } from '../src/modules/agreements/pdf-generation.service';
import { LockService } from '../src/common/lock/lock.service';
import { IdempotencyService } from '../src/common/idempotency/idempotency.service';
import { EscrowContractService } from '../src/modules/stellar/services/escrow-contract.service';
import { Property } from '../src/modules/properties/entities/property.entity';
import { User } from '../src/modules/users/entities/user.entity';

// ─── Fixtures ───────────────────────────────────────────────────────────────

const LANDLORD_ID = 'landlord-lifecycle-001';
const TENANT_ID = 'tenant-lifecycle-001';
const PROPERTY_ID = 'prop-lifecycle-001';
const STELLAR_LANDLORD =
  'GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN';
const STELLAR_TENANT =
  'GBVVJJWJ3QVNL4HFWXWQ3V2QVNL4HFWXWQ3V2QV4HFWXWQ3V2QVNL4H';

// ─── Inquiries module boundary ──────────────────────────────────────────────

const mockInquiryRepo = {
  create: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
};
const mockInquiryPropertyRepo = { findOne: jest.fn() };
const mockInquiryUserRepo = { findOne: jest.fn() };
const mockNotificationsService = {
  notify: jest.fn().mockResolvedValue(undefined),
};

// ─── Bookings module boundary ───────────────────────────────────────────────
// `BookingsService.create/confirm/cancel` all run inside a transaction via
// `dataSource.createQueryRunner()`, not the injected repositories directly —
// a single shared queryRunner double lets each step configure what the
// "transaction" sees and persists.
const mockBookingPropertyRepo = { findOne: jest.fn() };
const mockBookingRepo = {
  exists: jest.fn().mockResolvedValue(false),
  find: jest.fn(),
};
const mockBookingPaymentRepo = {};
const mockBookingEscrowRepo = {};
const mockPaymentService = {};
const mockStellarService = {};

const bookingsQueryRunner = {
  connect: jest.fn().mockResolvedValue(undefined),
  startTransaction: jest.fn().mockResolvedValue(undefined),
  commitTransaction: jest.fn().mockResolvedValue(undefined),
  rollbackTransaction: jest.fn().mockResolvedValue(undefined),
  release: jest.fn().mockResolvedValue(undefined),
  manager: {
    create: jest.fn((_entity: unknown, v: any) => ({ ...v })),
    save: jest.fn((v: any) =>
      Promise.resolve({ id: v.id ?? 'generated-id', ...v }),
    ),
    findOne: jest.fn(),
  },
};
const mockBookingsDataSource = {
  createQueryRunner: jest.fn(() => bookingsQueryRunner),
};

// ─── Agreements module boundary ─────────────────────────────────────────────

const mockAgreementRepo = {
  create: jest.fn((v: any) => v),
  save: jest.fn(),
  findOne: jest.fn(),
  count: jest.fn().mockResolvedValue(0),
};
const mockAgreementPaymentRepo = {
  create: jest.fn((v: any) => v),
  save: jest.fn(),
  find: jest.fn(),
};
const mockAuditService = { log: jest.fn().mockResolvedValue(undefined) };
const mockReviewPromptService = {
  schedulePrompt: jest.fn().mockResolvedValue(undefined),
};
const mockChiomaContract = {};
const mockBlockchainSync = {
  syncAgreementWithBlockchain: jest.fn().mockResolvedValue(undefined),
};
const mockTemplateService = {
  render: jest.fn().mockResolvedValue('<html></html>'),
};
const mockPdfService = {
  generate: jest.fn().mockResolvedValue(Buffer.from('pdf')),
};
const mockLockService = {
  acquireLock: jest.fn().mockResolvedValue('lock-token'),
  releaseLock: jest.fn().mockResolvedValue(true),
  withLock: jest.fn((_key: string, _ttlMs: number, fn: () => unknown) => fn()),
};
const mockIdempotencyService = {
  retrieve: jest.fn().mockResolvedValue(undefined),
  store: jest.fn().mockResolvedValue(undefined),
  process: jest.fn((_key: string, _ttlMs: number, fn: () => unknown) => fn()),
};
const mockEventEmitter = { emit: jest.fn() };

// ─── Escrow module boundary — the chain-facing boundary. Every call here is
// stubbed; nothing in this test talks to a real Stellar ledger. ────────────

const mockEscrowAgreementRepo = { findOne: jest.fn() };
const mockEscrowRepo = { create: jest.fn((v: any) => v), save: jest.fn() };
const mockEscrowContract = {
  createEscrow: jest.fn().mockResolvedValue('stub-tx-hash-escrow-created'),
  releaseEscrow: jest.fn().mockResolvedValue('stub-tx-hash-escrow-released'),
};
const escrowQueryRunner = {
  connect: jest.fn().mockResolvedValue(undefined),
  startTransaction: jest.fn().mockResolvedValue(undefined),
  commitTransaction: jest.fn().mockResolvedValue(undefined),
  rollbackTransaction: jest.fn().mockResolvedValue(undefined),
  release: jest.fn().mockResolvedValue(undefined),
  manager: {
    findOne: jest.fn(),
    create: jest.fn((_entity: unknown, v: any) => ({ ...v })),
    save: jest.fn((v: any) => Promise.resolve({ ...v })),
  },
};
const mockEscrowDataSource = {
  createQueryRunner: jest.fn(() => escrowQueryRunner),
};

describe('Lease Lifecycle Integration (#1624)', () => {
  let inquiries: InquiriesService;
  let bookings: BookingsService;
  let agreements: AgreementsService;
  let escrowIntegration: EscrowIntegrationService;

  beforeAll(async () => {
    const inquiriesModule: TestingModule = await Test.createTestingModule({
      providers: [
        InquiriesService,
        {
          provide: getRepositoryToken(PropertyInquiry),
          useValue: mockInquiryRepo,
        },
        {
          provide: getRepositoryToken(Property),
          useValue: mockInquiryPropertyRepo,
        },
        { provide: getRepositoryToken(User), useValue: mockInquiryUserRepo },
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile();
    inquiries = inquiriesModule.get(InquiriesService);

    const bookingsModule: TestingModule = await Test.createTestingModule({
      providers: [
        BookingsService,
        { provide: getRepositoryToken(Booking), useValue: mockBookingRepo },
        {
          provide: getRepositoryToken(Property),
          useValue: mockBookingPropertyRepo,
        },
        {
          provide: getRepositoryToken(BookingPayment),
          useValue: mockBookingPaymentRepo,
        },
        {
          provide: getRepositoryToken(StellarEscrow),
          useValue: mockBookingEscrowRepo,
        },
        { provide: PaymentService, useValue: mockPaymentService },
        { provide: StellarService, useValue: mockStellarService },
        { provide: DataSource, useValue: mockBookingsDataSource },
      ],
    }).compile();
    bookings = bookingsModule.get(BookingsService);

    const agreementsModule: TestingModule = await Test.createTestingModule({
      providers: [
        AgreementsService,
        AgreementStateService,
        {
          provide: getRepositoryToken(RentAgreement),
          useValue: mockAgreementRepo,
        },
        {
          provide: getRepositoryToken(AgreementPayment),
          useValue: mockAgreementPaymentRepo,
        },
        { provide: AuditService, useValue: mockAuditService },
        { provide: ReviewPromptService, useValue: mockReviewPromptService },
        { provide: ChiomaContractService, useValue: mockChiomaContract },
        { provide: BlockchainSyncService, useValue: mockBlockchainSync },
        {
          provide: EscrowIntegrationService,
          useValue: { createEscrowForAgreement: jest.fn() },
        },
        { provide: TemplateRenderingService, useValue: mockTemplateService },
        { provide: PDFGenerationService, useValue: mockPdfService },
        { provide: LockService, useValue: mockLockService },
        { provide: IdempotencyService, useValue: mockIdempotencyService },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();
    agreements = agreementsModule.get(AgreementsService);

    const escrowModule: TestingModule = await Test.createTestingModule({
      providers: [
        EscrowIntegrationService,
        {
          provide: getRepositoryToken(StellarEscrow),
          useValue: mockEscrowRepo,
        },
        {
          provide: getRepositoryToken(RentAgreement),
          useValue: mockEscrowAgreementRepo,
        },
        { provide: EscrowContractService, useValue: mockEscrowContract },
        { provide: DataSource, useValue: mockEscrowDataSource },
      ],
    }).compile();
    escrowIntegration = escrowModule.get(EscrowIntegrationService);
  });

  beforeEach(() => jest.clearAllMocks());

  // ─── Happy path: inquiry → booking → agreement → escrow → rent → termination ──

  describe('full happy path', () => {
    it('walks a lease from inquiry through termination', async () => {
      // 1. Inquiry — prospective tenant reaches out about the property.
      mockInquiryPropertyRepo.findOne.mockResolvedValue({
        id: PROPERTY_ID,
        title: 'Riverside Two-Bed',
        ownerId: LANDLORD_ID,
      });
      const createdInquiry = {
        id: 'inq-lifecycle-001',
        propertyId: PROPERTY_ID,
        fromUserId: TENANT_ID,
        toUserId: LANDLORD_ID,
        message: 'Is this still available for a 12-month lease?',
        status: PropertyInquiryStatus.PENDING,
        viewedAt: null,
      };
      mockInquiryRepo.create.mockReturnValue(createdInquiry);
      mockInquiryRepo.save.mockResolvedValue(createdInquiry);

      const inquiry = await inquiries.createInquiry(TENANT_ID, {
        propertyId: PROPERTY_ID,
        message: 'Is this still available for a 12-month lease?',
      });

      expect(inquiry.status).toBe(PropertyInquiryStatus.PENDING);
      expect(inquiry.toUserId).toBe(LANDLORD_ID);

      // The landlord views the inquiry before responding.
      mockInquiryRepo.findOne.mockResolvedValue({ ...createdInquiry });
      mockInquiryRepo.save.mockImplementation((v: any) => Promise.resolve(v));
      const viewed = await inquiries.markViewed(inquiry.id, LANDLORD_ID);
      expect(viewed.status).toBe(PropertyInquiryStatus.VIEWED);
      expect(viewed.viewedAt).toBeInstanceOf(Date);

      // 2. Booking — the tenant reserves the property.
      mockBookingPropertyRepo.findOne.mockResolvedValue({
        id: PROPERTY_ID,
        ownerId: LANDLORD_ID,
        price: 1800,
        currency: 'USD',
      });
      mockBookingRepo.exists.mockResolvedValue(false);

      const booking = await bookings.create(TENANT_ID, {
        propertyId: PROPERTY_ID,
        checkIn: '2026-09-01',
        checkOut: '2027-08-31',
        guests: 2,
      } as any);

      expect(booking.status).toBe(BookingStatus.PENDING);
      expect(booking.propertyId).toBe(PROPERTY_ID);
      expect(booking.guestId).toBe(TENANT_ID);

      bookingsQueryRunner.manager.findOne
        .mockResolvedValueOnce({
          id: booking.id,
          status: BookingStatus.PENDING,
          property: { ownerId: LANDLORD_ID },
          guest: { id: TENANT_ID },
        })
        .mockResolvedValueOnce(null); // no payment record to update in this test
      const confirmedBooking = await bookings.confirm(LANDLORD_ID, booking.id);
      expect(confirmedBooking.status).toBe(BookingStatus.CONFIRMED);

      // 3. Agreement — the confirmed booking becomes a lease agreement.
      const agreementSeed = {
        id: 'agr-lifecycle-001',
        agreementNumber: 'CHIOMA-2026-0001',
        propertyId: PROPERTY_ID,
        adminId: LANDLORD_ID,
        userId: TENANT_ID,
        adminStellarPubKey: STELLAR_LANDLORD,
        userStellarPubKey: STELLAR_TENANT,
        monthlyRent: 1800,
        securityDeposit: 3600,
        status: AgreementStatus.DRAFT,
        escrowBalance: 0,
        totalPaid: 0,
      };
      mockAgreementRepo.save.mockImplementation((v: any) =>
        Promise.resolve({ ...agreementSeed, ...v }),
      );

      const agreement = await agreements.create({
        propertyId: PROPERTY_ID,
        adminId: LANDLORD_ID,
        userId: TENANT_ID,
        adminStellarPubKey: STELLAR_LANDLORD,
        userStellarPubKey: STELLAR_TENANT,
        monthlyRent: 1800,
        securityDeposit: 3600,
        startDate: '2026-09-01',
        endDate: '2027-08-31',
      } as any);

      expect(agreement.status).toBe(AgreementStatus.DRAFT);

      // 4. Escrow — the security deposit is escrowed on-chain (stubbed).
      // `createEscrowForAgreement` reads the agreement inside its own
      // transaction (via the query runner), not through the injected repo.
      escrowQueryRunner.manager.findOne.mockResolvedValue({
        id: agreement.id,
        securityDeposit: 3600,
        userStellarPubKey: STELLAR_TENANT,
        adminStellarPubKey: STELLAR_LANDLORD,
      });

      const escrow = await escrowIntegration.createEscrowForAgreement(
        agreement.id,
      );

      expect(mockEscrowContract.createEscrow).toHaveBeenCalledWith(
        expect.objectContaining({
          depositor: STELLAR_TENANT,
          beneficiary: STELLAR_LANDLORD,
        }),
      );
      expect(escrow.status).toBe(EscrowStatus.PENDING);
      expect(escrow.blockchainEscrowId).toBe('stub-tx-hash-escrow-created');

      // Agreement progresses through the deposit/signature states once
      // escrow is in place.
      mockAgreementRepo.findOne.mockResolvedValue({
        ...agreementSeed,
        status: AgreementStatus.DRAFT,
      });
      const pendingDeposit = await agreements.updateStatusWithGuard(
        agreement.id,
        AgreementStatus.PENDING_DEPOSIT,
      );
      expect(pendingDeposit.status).toBe(AgreementStatus.PENDING_DEPOSIT);

      mockAgreementRepo.findOne.mockResolvedValue({
        ...agreementSeed,
        status: AgreementStatus.PENDING_DEPOSIT,
      });
      const signed = await agreements.updateStatusWithGuard(
        agreement.id,
        AgreementStatus.SIGNED,
      );
      expect(signed.status).toBe(AgreementStatus.SIGNED);

      mockAgreementRepo.findOne.mockResolvedValue({
        ...agreementSeed,
        status: AgreementStatus.SIGNED,
      });
      const active = await agreements.updateStatusWithGuard(
        agreement.id,
        AgreementStatus.ACTIVE,
      );
      expect(active.status).toBe(AgreementStatus.ACTIVE);

      // 5. Rent schedule — monthly rent payments are recorded against the
      // active agreement.
      mockAgreementRepo.findOne.mockResolvedValue({
        ...agreementSeed,
        status: AgreementStatus.ACTIVE,
      });
      const recordedPayments: any[] = [];
      mockAgreementPaymentRepo.save.mockImplementation((v: any) => {
        const saved = { id: `pay-${recordedPayments.length + 1}`, ...v };
        recordedPayments.push(saved);
        return Promise.resolve(saved);
      });

      const septemberRent = await agreements.recordPayment(agreement.id, {
        amount: 1800,
        paymentDate: '2026-09-01',
        paymentMethod: 'Stellar Transfer',
      } as any);
      expect(septemberRent.amount).toBe(1800);
      expect(septemberRent.status).toBe(PaymentStatus.COMPLETED);
      expect(septemberRent.agreementId).toBe(agreement.id);

      const octoberRent = await agreements.recordPayment(agreement.id, {
        amount: 1800,
        paymentDate: '2026-10-01',
        paymentMethod: 'Stellar Transfer',
      } as any);
      expect(octoberRent.amount).toBe(1800);

      // The rent schedule for this lease now shows both months paid.
      mockAgreementPaymentRepo.find.mockResolvedValue(recordedPayments);
      const rentSchedule = await agreements.getPayments(agreement.id);
      expect(rentSchedule).toHaveLength(2);
      expect(
        rentSchedule.reduce((sum: number, p: any) => sum + p.amount, 0),
      ).toBe(3600);

      // 6. Termination — the lease ends.
      mockAgreementRepo.findOne.mockResolvedValue({
        ...agreementSeed,
        status: AgreementStatus.ACTIVE,
      });
      mockAgreementRepo.save.mockImplementation((v: any) => Promise.resolve(v));
      const terminated = await agreements.terminate(agreement.id, {
        terminationReason: 'End of lease term',
      });

      expect(terminated.status).toBe(AgreementStatus.TERMINATED);

      // A terminated agreement cannot be terminated again.
      mockAgreementRepo.findOne.mockResolvedValue({
        ...agreementSeed,
        status: AgreementStatus.TERMINATED,
      });
      await expect(
        agreements.terminate(agreement.id, {
          terminationReason: 'Duplicate termination attempt',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ─── Abandonment path ──────────────────────────────────────────────────────

  describe('abandonment path', () => {
    it('lets an inquiry go stale without ever producing a booking or agreement', async () => {
      mockInquiryPropertyRepo.findOne.mockResolvedValue({
        id: PROPERTY_ID,
        title: 'Riverside Two-Bed',
        ownerId: LANDLORD_ID,
      });
      const staleInquiry = {
        id: 'inq-lifecycle-abandoned',
        propertyId: PROPERTY_ID,
        fromUserId: TENANT_ID,
        toUserId: LANDLORD_ID,
        message: 'Just checking availability, not decided yet.',
        status: PropertyInquiryStatus.PENDING,
        viewedAt: null,
      };
      mockInquiryRepo.create.mockReturnValue(staleInquiry);
      mockInquiryRepo.save.mockResolvedValue(staleInquiry);

      const inquiry = await inquiries.createInquiry(TENANT_ID, {
        propertyId: PROPERTY_ID,
        message: 'Just checking availability, not decided yet.',
      });

      // No booking or agreement is ever created for this inquiry — it
      // simply stays PENDING. Nothing downstream should have been touched.
      expect(inquiry.status).toBe(PropertyInquiryStatus.PENDING);
      expect(bookingsQueryRunner.manager.save).not.toHaveBeenCalled();
      expect(mockAgreementRepo.save).not.toHaveBeenCalled();
      expect(mockEscrowContract.createEscrow).not.toHaveBeenCalled();
    });

    it('rejects a booking cancellation from a user who is not the property owner', async () => {
      const abandonedBookingId = 'booking-lifecycle-abandoned';
      bookingsQueryRunner.manager.findOne.mockResolvedValueOnce({
        id: abandonedBookingId,
        status: BookingStatus.PENDING,
        property: { ownerId: LANDLORD_ID },
        guest: { id: TENANT_ID },
      });

      await expect(
        bookings.cancel('someone-else-entirely', abandonedBookingId),
      ).rejects.toThrow();

      // The abandoned booking is never carried forward into an agreement.
      expect(mockAgreementRepo.save).not.toHaveBeenCalled();
    });

    it('refuses to reactivate a terminated agreement (no re-entry after abandonment)', () => {
      const stateService = new AgreementStateService();

      expect(() =>
        stateService.validateTransition(
          AgreementStatus.TERMINATED,
          AgreementStatus.ACTIVE,
        ),
      ).toThrow(ConflictException);
    });
  });
});
