/**
 * Named seed scenarios for frontend development.
 *
 * Each scenario seeds one row per major UI state of a domain object so every
 * screen (in-progress lease, disputed escrow, tenant mid-screening, ...) has
 * data to render. Scenarios are idempotent and build on the users/properties
 * created by seedComprehensiveData.
 *
 * Usage:
 *   pnpm seed -- --scenario=lease,escrow
 *   pnpm seed -- --scenario=all
 *   pnpm seed -- --list-scenarios
 */

import { DataSource, Repository } from 'typeorm';
import { User, UserRole } from '../../modules/users/entities/user.entity';
import { Property } from '../../modules/properties/entities/property.entity';
import {
  AgreementStatus,
  RentAgreement,
} from '../../modules/rent/entities/rent-contract.entity';
import {
  Dispute,
  DisputeStatus,
  DisputeType,
} from '../../modules/disputes/entities/dispute.entity';
import {
  StellarAccount,
  StellarAccountType,
} from '../../modules/stellar/entities/stellar-account.entity';
import {
  EscrowStatus,
  StellarEscrow,
} from '../../modules/stellar/entities/stellar-escrow.entity';
import { AssetType } from '../../modules/stellar/entities/stellar-transaction.entity';
import { TenantScreeningRequest } from '../../modules/screening/entities/tenant-screening-request.entity';
import {
  ScreeningCheckType,
  UserScreeningProvider,
  UserScreeningRiskLevel,
  UserScreeningStatus,
} from '../../modules/screening/screening.enums';
import { createScriptLogger } from '../../common/services/script-logger';

const logger = createScriptLogger('seed-scenarios');

const DAY_MS = 86_400_000;
const daysFromNow = (days: number) => new Date(Date.now() + days * DAY_MS);

interface ScenarioContext {
  dataSource: DataSource;
  tenant: User;
  landlord: User;
  property: Property;
}

interface Scenario {
  description: string;
  run: (ctx: ScenarioContext) => Promise<number>;
}

// ─── Lease: one agreement per AgreementStatus ────────────────────────────────

const LEASE_STATES: Array<{
  status: AgreementStatus;
  start: number | null;
  end: number | null;
}> = [
  { status: AgreementStatus.DRAFT, start: null, end: null },
  { status: AgreementStatus.PENDING_DEPOSIT, start: 14, end: 379 },
  { status: AgreementStatus.SIGNED, start: 7, end: 372 },
  { status: AgreementStatus.ACTIVE, start: -90, end: 275 },
  { status: AgreementStatus.EXPIRED, start: -400, end: -35 },
  { status: AgreementStatus.TERMINATED, start: -200, end: 165 },
  { status: AgreementStatus.DISPUTED, start: -150, end: 215 },
];

async function upsertAgreement(
  repo: Repository<RentAgreement>,
  ctx: ScenarioContext,
  state: (typeof LEASE_STATES)[number],
): Promise<[RentAgreement, boolean]> {
  const agreementNumber = `AGR-SCN-${state.status.toUpperCase()}`;
  const existing = await repo.findOne({ where: { agreementNumber } });
  if (existing) return [existing, false];

  const agreement = await repo.save(
    repo.create({
      agreementNumber,
      propertyId: ctx.property.id,
      adminId: ctx.landlord.id,
      userId: ctx.tenant.id,
      status: state.status,
      monthlyRent: 200000,
      securityDeposit: 400000,
      startDate: state.start === null ? null : daysFromNow(state.start),
      endDate: state.end === null ? null : daysFromNow(state.end),
      renewalOption: state.status === AgreementStatus.ACTIVE,
    }),
  );
  return [agreement, true];
}

async function seedLeaseScenario(ctx: ScenarioContext): Promise<number> {
  const repo = ctx.dataSource.getRepository(RentAgreement);
  let created = 0;
  for (const state of LEASE_STATES) {
    const [, isNew] = await upsertAgreement(repo, ctx, state);
    if (isNew) created++;
  }
  return created;
}

// ─── Escrow: one escrow per EscrowStatus (DISPUTED linked to a dispute) ──────

function fakePublicKey(label: string): string {
  const body = label.toUpperCase().replace(/[^A-Z2-7]/g, '');
  return `GSEED${body}`.padEnd(56, 'A').slice(0, 56);
}

async function upsertStellarAccount(
  repo: Repository<StellarAccount>,
  label: string,
  type: StellarAccountType,
  userId: string | null,
): Promise<StellarAccount> {
  const publicKey = fakePublicKey(label);
  const existing = await repo.findOne({ where: { publicKey } });
  if (existing) return existing;
  return repo.save(
    repo.create({
      publicKey,
      userId,
      accountType: type,
      secretKeyEncrypted: 'seed-placeholder-not-a-real-secret',
      balance: '10000',
    }),
  );
}

async function seedEscrowScenario(ctx: ScenarioContext): Promise<number> {
  const accountRepo = ctx.dataSource.getRepository(StellarAccount);
  const escrowRepo = ctx.dataSource.getRepository(StellarEscrow);
  const disputeRepo = ctx.dataSource.getRepository(Dispute);
  const agreementRepo = ctx.dataSource.getRepository(RentAgreement);

  const [agreement] = await upsertAgreement(
    agreementRepo,
    ctx,
    LEASE_STATES.find((s) => s.status === AgreementStatus.DISPUTED)!,
  );
  const source = await upsertStellarAccount(
    accountRepo,
    'tenant',
    StellarAccountType.USER,
    ctx.tenant.id,
  );
  const destination = await upsertStellarAccount(
    accountRepo,
    'landlord',
    StellarAccountType.USER,
    ctx.landlord.id,
  );

  let created = 0;
  for (const status of Object.values(EscrowStatus)) {
    const escrowAccount = await upsertStellarAccount(
      accountRepo,
      `escrow${status}`,
      StellarAccountType.ESCROW,
      null,
    );
    const existing = await escrowRepo.findOne({
      where: { escrowAccountId: escrowAccount.id },
    });
    if (existing) continue;

    let disputeRef: string | null = null;
    if (status === EscrowStatus.DISPUTED) {
      const disputeKey = 'DISPUTE-SCN-ESCROW';
      const dispute =
        (await disputeRepo.findOne({ where: { disputeId: disputeKey } })) ??
        (await disputeRepo.save(
          disputeRepo.create({
            disputeId: disputeKey,
            agreementId: agreement.id,
            initiatedBy: ctx.tenant.id,
            disputeType: DisputeType.SECURITY_DEPOSIT,
            requestedAmount: 400000,
            description: 'Tenant disputes withholding of the security deposit.',
            status: DisputeStatus.UNDER_REVIEW,
          }),
        ));
      disputeRef = dispute.disputeId;
    }

    await escrowRepo.save(
      escrowRepo.create({
        escrowAccountId: escrowAccount.id,
        sourceAccountId: source.id,
        destinationAccountId: destination.id,
        amount: '400000',
        assetType: AssetType.NATIVE,
        sequenceNumber: '0',
        status,
        rentAgreementId: agreement.id,
        expirationDate: daysFromNow(
          status === EscrowStatus.EXPIRED ? -10 : 180,
        ),
        releasedAt: status === EscrowStatus.RELEASED ? daysFromNow(-5) : null,
        refundedAt: status === EscrowStatus.REFUNDED ? daysFromNow(-5) : null,
        refundedAmount: status === EscrowStatus.REFUNDED ? '400000' : '0',
        escrowMetadata: disputeRef ? { disputeRef } : null,
        disputeReason:
          status === EscrowStatus.DISPUTED
            ? 'Security deposit withholding contested'
            : null,
      }),
    );
    created++;
  }
  return created;
}

// ─── Screening: one request per UserScreeningStatus ──────────────────────────

async function seedScreeningScenario(ctx: ScenarioContext): Promise<number> {
  const repo = ctx.dataSource.getRepository(TenantScreeningRequest);
  let created = 0;
  for (const status of Object.values(UserScreeningStatus)) {
    const providerReference = `SCN-SCREEN-${status}`;
    const existing = await repo.findOne({ where: { providerReference } });
    if (existing) continue;

    const consented = status !== UserScreeningStatus.PENDING_CONSENT;
    const submitted = ![
      UserScreeningStatus.PENDING_CONSENT,
      UserScreeningStatus.CONSENTED,
    ].includes(status);

    await repo.save(
      repo.create({
        tenantId: ctx.tenant.id,
        requestedByUserId: ctx.landlord.id,
        provider: UserScreeningProvider.TRANSUNION_SMARTMOVE,
        requestedChecks: [
          ScreeningCheckType.CREDIT,
          ScreeningCheckType.BACKGROUND,
          ScreeningCheckType.RENTAL_HISTORY,
        ],
        status,
        consentVersion: 'v1',
        providerReference,
        encryptedApplicantData: 'seed-placeholder',
        consentGrantedAt: consented ? daysFromNow(-3) : null,
        consentExpiresAt: consented
          ? daysFromNow(status === UserScreeningStatus.EXPIRED ? -1 : 27)
          : null,
        submittedAt: submitted ? daysFromNow(-2) : null,
        completedAt:
          status === UserScreeningStatus.COMPLETED ? daysFromNow(-1) : null,
        failureReason:
          status === UserScreeningStatus.FAILED
            ? 'Provider could not verify applicant identity'
            : null,
        reportSummary:
          status === UserScreeningStatus.COMPLETED
            ? { riskLevel: UserScreeningRiskLevel.LOW, creditScore: 720 }
            : null,
      }),
    );
    created++;
  }
  return created;
}

// ─── Registry & runner ───────────────────────────────────────────────────────

export const SEED_SCENARIOS: Record<string, Scenario> = {
  lease: {
    description:
      'Agreements in every status (draft, pending deposit, signed, active, expired, terminated, disputed)',
    run: seedLeaseScenario,
  },
  escrow: {
    description:
      'Escrows in every status, including a disputed escrow linked to an open dispute',
    run: seedEscrowScenario,
  },
  screening: {
    description:
      'Tenant screening requests in every status, including mid-screening (in progress)',
    run: seedScreeningScenario,
  },
};

export function resolveScenarioNames(raw: string): string[] {
  const names = raw
    .split(',')
    .map((n) => n.trim())
    .filter(Boolean);
  if (names.includes('all')) return Object.keys(SEED_SCENARIOS);
  const unknown = names.filter((n) => !SEED_SCENARIOS[n]);
  if (unknown.length) {
    throw new Error(
      `Unknown scenario(s): ${unknown.join(', ')}. Available: ${Object.keys(SEED_SCENARIOS).join(', ')}, all`,
    );
  }
  return names;
}

export async function seedScenarios(
  dataSource: DataSource,
  names: string[],
): Promise<void> {
  const userRepo = dataSource.getRepository(User);
  const tenant = await userRepo.findOne({ where: { role: UserRole.USER } });
  const landlord = await userRepo.findOne({ where: { role: UserRole.ADMIN } });
  const property = landlord
    ? await dataSource
        .getRepository(Property)
        .findOne({ where: { ownerId: landlord.id } })
    : null;
  if (!tenant || !landlord || !property) {
    throw new Error(
      'Scenario seeding requires base seed data (users and properties).',
    );
  }

  const ctx: ScenarioContext = { dataSource, tenant, landlord, property };
  for (const name of names) {
    const created = await SEED_SCENARIOS[name].run(ctx);
    logger.log(
      `Scenario "${name}" ready: ${created} created (skipped existing)`,
    );
  }
}
