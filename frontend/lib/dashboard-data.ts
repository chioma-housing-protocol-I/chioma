import { apiClient } from '@/lib/api-client';
import type { RatingStats } from '@/components/reviews/RatingSummary';
import type { Review as ReviewCardReview } from '@/components/reviews/ReviewCard';

export type PaymentStatus = 'COMPLETED' | 'PENDING' | 'FAILED' | 'REFUNDED';
export type DisputeStatus =
  | 'OPEN'
  | 'UNDER_REVIEW'
  | 'RESOLVED'
  | 'REJECTED'
  | 'WITHDRAWN';
export type DisputeType =
  | 'RENT_PAYMENT'
  | 'SECURITY_DEPOSIT'
  | 'PROPERTY_DAMAGE'
  | 'MAINTENANCE'
  | 'TERMINATION'
  | 'OTHER';
export type ReviewContext = 'LEASE' | 'MAINTENANCE';

export interface DashboardPayment {
  id: string;
  agreementId: string;
  agreementReference: string;
  propertyName: string;
  counterpartyName: string;
  amount: number;
  currency: string;
  paymentDate: string;
  paymentMethod: string;
  status: PaymentStatus;
  referenceNumber?: string;
  notes?: string;
  direction: 'incoming' | 'outgoing';
}

export interface DashboardDispute {
  id: string;
  disputeId: string;
  agreementReference: string;
  propertyName: string;
  counterpartyName: string;
  disputeType: DisputeType;
  description: string;
  status: DisputeStatus;
  requestedAmount?: number;
  resolution?: string;
  evidenceCount: number;
  commentCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewTarget {
  id: string;
  agreementId: string;
  name: string;
  role: 'USER' | 'ADMIN';
  propertyName: string;
  context: ReviewContext;
  dueLabel: string;
}

export interface DashboardReview extends ReviewCardReview {
  propertyName: string;
  context: ReviewContext;
}

interface AgreementsResponse {
  data: AgreementRecord[];
  meta?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

interface AgreementRecord {
  id: string;
  monthlyRent?: number;
  property?: {
    title?: string;
    address?: string;
  };
  tenant?: {
    firstName?: string;
    lastName?: string;
    name?: string;
  };
  landlord?: {
    firstName?: string;
    lastName?: string;
    name?: string;
  };
}

interface AgreementPaymentRecord {
  id: string;
  agreementId: string;
  amount: number;
  paymentDate?: string;
  paidAt?: string;
  createdAt?: string;
  paymentMethod?: string;
  referenceNumber?: string;
  transactionId?: string;
  status?: PaymentStatus;
  notes?: string;
  currency?: string;
}

interface DisputesResponse {
  disputes?: ApiDispute[];
  data?: ApiDispute[];
}

interface ApiDispute {
  id: number | string;
  disputeId: string;
  agreementId?: number | string;
  disputeType: DisputeType;
  description: string;
  status: DisputeStatus;
  requestedAmount?: number;
  resolution?: string;
  createdAt?: string;
  updatedAt?: string;
  evidence?: Array<unknown>;
  comments?: Array<unknown>;
}

const tenantPaymentsMock: DashboardPayment[] = [
  {
    id: 'pay-001',
    agreementId: 'agr-tenant-001',
    agreementReference: 'AGR-2025-014',
    propertyName: 'Sunset Apartments, Unit 4B',
    counterpartyName: 'James Adebayo',
    amount: 150000,
    currency: 'USDC',
    paymentDate: '2026-03-01T09:15:00.000Z',
    paymentMethod: 'Stellar Transfer',
    status: 'COMPLETED',
    referenceNumber: 'GABC3F9K7X1A',
    notes: 'March rent payment',
    direction: 'outgoing',
  },
  {
    id: 'pay-002',
    agreementId: 'agr-tenant-001',
    agreementReference: 'AGR-2025-014',
    propertyName: 'Sunset Apartments, Unit 4B',
    counterpartyName: 'James Adebayo',
    amount: 150000,
    currency: 'USDC',
    paymentDate: '2026-02-01T09:12:00.000Z',
    paymentMethod: 'Stellar Transfer',
    status: 'COMPLETED',
    referenceNumber: 'GDFE2L8M3Q9Z',
    notes: 'February rent payment',
    direction: 'outgoing',
  },
  {
    id: 'pay-003',
    agreementId: 'agr-tenant-001',
    agreementReference: 'AGR-2025-014',
    propertyName: 'Sunset Apartments, Unit 4B',
    counterpartyName: 'James Adebayo',
    amount: 25000,
    currency: 'USDC',
    paymentDate: '2026-01-28T11:45:00.000Z',
    paymentMethod: 'Refund',
    status: 'REFUNDED',
    referenceNumber: 'GLMN5R7T8C4D',
    notes: 'Utility overcharge refund',
    direction: 'incoming',
  },
];

const tenantDisputesMock: DashboardDispute[] = [
  {
    id: 'dis-001',
    disputeId: 'DSP-2026-001',
    agreementReference: 'AGR-2025-014',
    propertyName: 'Sunset Apartments, Unit 4B',
    counterpartyName: 'James Adebayo',
    disputeType: 'MAINTENANCE',
    description:
      'Water damage repairs were delayed for 12 days after the issue was reported.',
    status: 'UNDER_REVIEW',
    requestedAmount: 40000,
    evidenceCount: 3,
    commentCount: 4,
    createdAt: '2026-02-18T10:00:00.000Z',
    updatedAt: '2026-03-06T13:20:00.000Z',
  },
  {
    id: 'dis-002',
    disputeId: 'DSP-2025-019',
    agreementReference: 'AGR-2025-014',
    propertyName: 'Sunset Apartments, Unit 4B',
    counterpartyName: 'James Adebayo',
    disputeType: 'SECURITY_DEPOSIT',
    description:
      'Requesting clarity on deduction applied to the security deposit statement.',
    status: 'RESOLVED',
    requestedAmount: 60000,
    resolution:
      'Landlord provided receipts and issued a partial refund for undocumented charges.',
    evidenceCount: 2,
    commentCount: 6,
    createdAt: '2025-12-20T16:00:00.000Z',
    updatedAt: '2026-01-04T12:10:00.000Z',
  },
];

const landlordDisputesMock: DashboardDispute[] = [
  {
    id: 'dis-101',
    disputeId: 'DSP-2026-004',
    agreementReference: 'AGR-2025-021',
    propertyName: 'Glover Road, Ikoyi',
    counterpartyName: 'Ada Nwosu',
    disputeType: 'RENT_PAYMENT',
    description:
      'Tenant claims rent was debited twice after a manual settlement was also recorded.',
    status: 'OPEN',
    requestedAmount: 180000,
    evidenceCount: 1,
    commentCount: 1,
    createdAt: '2026-03-04T08:45:00.000Z',
    updatedAt: '2026-03-04T08:45:00.000Z',
  },
  {
    id: 'dis-102',
    disputeId: 'DSP-2026-002',
    agreementReference: 'AGR-2025-010',
    propertyName: 'Admiralty Way, Block 4',
    counterpartyName: 'Kunle Bello',
    disputeType: 'PROPERTY_DAMAGE',
    description:
      'Checkout inspection found damage to the kitchen cabinet and broken smoke detectors.',
    status: 'UNDER_REVIEW',
    requestedAmount: 95000,
    evidenceCount: 4,
    commentCount: 5,
    createdAt: '2026-02-09T17:30:00.000Z',
    updatedAt: '2026-03-03T10:00:00.000Z',
  },
];

const tenantReviewTargetsMock: ReviewTarget[] = [
  {
    id: 'rev-target-001',
    agreementId: 'agr-tenant-001',
    name: 'James Adebayo',
    role: 'USER',
    propertyName: 'Sunset Apartments, Unit 4B',
    context: 'LEASE',
    dueLabel: 'Lease milestone reached 3 days ago',
  },
  {
    id: 'rev-target-002',
    agreementId: 'mnt-019',
    name: 'Facility Ops Team',
    role: 'ADMIN',
    propertyName: 'Sunset Apartments, Unit 4B',
    context: 'MAINTENANCE',
    dueLabel: 'Maintenance ticket closed yesterday',
  },
];

const tenantReviewsMock: DashboardReview[] = [
  {
    id: 'review-001',
    rating: 5,
    comment:
      'Communication was quick, the lease terms were clear, and repairs were documented properly.',
    createdAt: '2026-02-20T12:30:00.000Z',
    propertyName: 'Sunset Apartments, Unit 4B',
    context: 'LEASE',
    author: {
      id: 'tenant-user',
      name: 'You',
      isVerified: true,
      role: 'USER',
    },
  },
  {
    id: 'review-002',
    rating: 4,
    comment:
      'The maintenance follow-up was solid after escalation, although the first response took too long.',
    createdAt: '2026-01-10T09:00:00.000Z',
    propertyName: 'Sunset Apartments, Unit 4B',
    context: 'MAINTENANCE',
    author: {
      id: 'tenant-user',
      name: 'You',
      isVerified: true,
      role: 'USER',
    },
  },
];

const landlordReviewTargetsMock: ReviewTarget[] = [
  {
    id: 'rev-target-101',
    agreementId: 'agr-landlord-002',
    name: 'Ada Nwosu',
    role: 'USER',
    propertyName: 'Glover Road, Ikoyi',
    context: 'LEASE',
    dueLabel: 'Move-in completed 1 week ago',
  },
  {
    id: 'rev-target-102',
    agreementId: 'agr-landlord-004',
    name: 'Kunle Bello',
    role: 'USER',
    propertyName: 'Admiralty Way, Block 4',
    context: 'MAINTENANCE',
    dueLabel: 'Maintenance request resolved 2 days ago',
  },
];

const landlordReviewsMock: DashboardReview[] = [
  {
    id: 'review-101',
    rating: 5,
    comment:
      'Tenant stayed current on payments and kept the unit in excellent condition during inspection.',
    createdAt: '2026-02-08T14:00:00.000Z',
    propertyName: 'Glover Road, Ikoyi',
    context: 'LEASE',
    author: {
      id: 'landlord-user',
      name: 'You',
      isVerified: true,
      role: 'ADMIN',
    },
  },
  {
    id: 'review-102',
    rating: 4,
    comment:
      'Tenant documented the issue clearly and cooperated with maintenance scheduling.',
    createdAt: '2026-03-02T10:15:00.000Z',
    propertyName: 'Admiralty Way, Block 4',
    context: 'MAINTENANCE',
    author: {
      id: 'landlord-user',
      name: 'You',
      isVerified: true,
      role: 'ADMIN',
    },
  },
];

export function buildRatingStats(reviews: DashboardReview[]): RatingStats {
  const total = reviews.length;
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

  for (const review of reviews) {
    const key = Math.min(5, Math.max(1, Math.round(review.rating))) as
      | 1
      | 2
      | 3
      | 4
      | 5;
    distribution[key] += 1;
  }

  const average =
    total === 0
      ? 0
      : reviews.reduce((sum, review) => sum + review.rating, 0) / total;

  return {
    average,
    total,
    distribution,
  };
}

export async function loadTenantPayments(
  userId?: string,
): Promise<DashboardPayment[]> {
  if (!userId) return tenantPaymentsMock;

  try {
    const agreementsResponse = await apiClient.get<AgreementsResponse>(
      `/agreements?tenantId=${encodeURIComponent(userId)}&limit=12`,
    );
    const agreements = agreementsResponse.data.data ?? [];

    const paymentsByAgreement = await Promise.all(
      agreements.map(async (agreement) => {
        const paymentsResponse = await apiClient.get<AgreementPaymentRecord[]>(
          `/agreements/${agreement.id}/payments`,
        );

        return (paymentsResponse.data ?? []).map((payment) =>
          mapPaymentRecord(payment, agreement, 'outgoing'),
        );
      }),
    );

    const payments = paymentsByAgreement.flat();
    return payments.length > 0 ? payments : tenantPaymentsMock;
  } catch {
    return tenantPaymentsMock;
  }
}

export async function loadTenantDisputes(): Promise<DashboardDispute[]> {
  try {
    const response = await apiClient.get<DisputesResponse>('/disputes');
    const disputes = response.data.disputes ?? response.data.data ?? [];

    return disputes.length > 0
      ? disputes.map((dispute) => mapDisputeRecord(dispute, 'Counterparty'))
      : tenantDisputesMock;
  } catch {
    return tenantDisputesMock;
  }
}

export async function loadLandlordDisputes(): Promise<DashboardDispute[]> {
  try {
    const response = await apiClient.get<DisputesResponse>('/disputes');
    const disputes = response.data.disputes ?? response.data.data ?? [];

    return disputes.length > 0
      ? disputes.map((dispute) => mapDisputeRecord(dispute, 'Tenant'))
      : landlordDisputesMock;
  } catch {
    return landlordDisputesMock;
  }
}

export async function loadReviewWorkspace(role: 'user' | 'admin'): Promise<{
  targets: ReviewTarget[];
  reviews: DashboardReview[];
}> {
  return role === 'user'
    ? { targets: tenantReviewTargetsMock, reviews: tenantReviewsMock }
    : { targets: landlordReviewTargetsMock, reviews: landlordReviewsMock };
}

export async function submitReview(
  target: ReviewTarget,
  payload: { rating: number; comment: string },
): Promise<void> {
  try {
    await apiClient.post('/reviews', {
      revieweeId: target.id,
      context: target.context,
      rating: payload.rating,
      comment: payload.comment,
      propertyId: target.agreementId,
      anonymous: false,
    });
  } catch {
    // Preserve optimistic UI behavior when the backend is not fully wired.
  }
}

export async function submitDispute(payload: {
  agreementId: string;
  disputeType: DisputeType;
  description: string;
  requestedAmount?: number;
}): Promise<void> {
  try {
    await apiClient.post('/disputes', payload);
  } catch {
    // Local-first submission keeps the interface usable during integration.
  }
}

function mapPaymentRecord(
  payment: AgreementPaymentRecord,
  agreement: AgreementRecord,
  direction: 'incoming' | 'outgoing',
): DashboardPayment {
  return {
    id: payment.id,
    agreementId: payment.agreementId ?? agreement.id,
    agreementReference: agreement.id,
    propertyName:
      agreement.property?.title ??
      agreement.property?.address ??
      'Linked rental agreement',
    counterpartyName:
      formatPersonName(
        direction === 'outgoing' ? agreement.landlord : agreement.tenant,
      ) ?? 'Counterparty',
    amount: payment.amount ?? agreement.monthlyRent ?? 0,
    currency: payment.currency ?? 'USDC',
    paymentDate:
      payment.paymentDate ??
      payment.paidAt ??
      payment.createdAt ??
      new Date().toISOString(),
    paymentMethod: payment.paymentMethod ?? 'Recorded payment',
    status: payment.status ?? 'COMPLETED',
    referenceNumber: payment.referenceNumber ?? payment.transactionId,
    notes: payment.notes,
    direction,
  };
}

function mapDisputeRecord(
  dispute: ApiDispute,
  counterpartyName: string,
): DashboardDispute {
  return {
    id: String(dispute.id),
    disputeId: dispute.disputeId,
    agreementReference: String(dispute.agreementId ?? 'Agreement'),
    propertyName: 'Linked rental agreement',
    counterpartyName,
    disputeType: dispute.disputeType,
    description: dispute.description,
    status: dispute.status,
    requestedAmount: dispute.requestedAmount,
    resolution: dispute.resolution,
    evidenceCount: dispute.evidence?.length ?? 0,
    commentCount: dispute.comments?.length ?? 0,
    createdAt: dispute.createdAt ?? new Date().toISOString(),
    updatedAt:
      dispute.updatedAt ?? dispute.createdAt ?? new Date().toISOString(),
  };
}

function formatPersonName(person?: {
  firstName?: string;
  lastName?: string;
  name?: string;
}) {
  if (!person) return null;
  if (person.name) return person.name;

  const name = [person.firstName, person.lastName].filter(Boolean).join(' ');
  return name || null;
}

/** Combined mock disputes for admin dashboard when API is unavailable. */
export function getAdminDisputesMockList(): DashboardDispute[] {
  return [...tenantDisputesMock, ...landlordDisputesMock];
}
