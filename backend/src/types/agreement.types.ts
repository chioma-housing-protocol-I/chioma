// backend/src/types/agreement.types.ts

import {
  UUID,
  ISO8601DateTime,
  StellarPublicKey,
  TransactionHash,
} from './common.types';

export type AgreementStatus =
  | 'draft'
  | 'pending_deposit'
  | 'active'
  | 'expired'
  | 'terminated'
  | 'disputed';
export type TerminationReason =
  | 'lease_end'
  | 'early_termination_tenant'
  | 'early_termination_landlord'
  | 'eviction'
  | 'mutual_agreement';
export type PaymentFrequency =
  | 'monthly'
  | 'quarterly'
  | 'semi_annual'
  | 'annual';

export interface RentAgreement {
  id: UUID;
  agreementNumber: string; // e.g., "CHIOMA-2026-0001"

  // Parties
  propertyId: UUID;
  landlordId: UUID;
  tenantId: UUID;
  agentId?: UUID;

  // Stellar accounts
  landlordStellarPubKey: StellarPublicKey;
  tenantStellarPubKey: StellarPublicKey;
  agentStellarPubKey?: StellarPublicKey;
  escrowAccountPubKey?: StellarPublicKey;

  // Financial terms
  monthlyRent: string;
  currency: string;
  securityDeposit: string;
  agentCommissionRate: number; // Percentage
  agentCommissionAmount: string;
  paymentFrequency: PaymentFrequency;

  // Payment tracking
  firstPaymentDueDate: ISO8601DateTime;
  lastPaymentDate?: ISO8601DateTime;
  totalPaymentsMade: number;
  totalAmountPaid: string;

  // Stellar transaction references
  depositTxHash?: TransactionHash;
  depositPaidAt?: ISO8601DateTime;

  // Lease terms
  startDate: ISO8601DateTime;
  endDate: ISO8601DateTime;
  leaseDurationMonths: number;
  renewalOption: boolean;
  renewalNoticeDays?: number;
  /** Calendar date by which renewal notice is due (if applicable) */
  renewalNoticeDate?: ISO8601DateTime;
  moveInDate?: ISO8601DateTime;
  moveOutDate?: ISO8601DateTime;
  utilitiesIncluded?: boolean;
  maintenanceResponsibility?: string;
  earlyTerminationFee?: string;
  lateFeePercentage?: number;
  gracePeriodDays?: number;

  // Terms and conditions
  termsAndConditions: string;
  specialClauses: AgreementClause[];

  // Status
  status: AgreementStatus;

  // Termination
  terminatedAt?: ISO8601DateTime;
  terminationReason?: TerminationReason;
  terminationNotes?: string;

  // Signatures
  landlordSignedAt?: ISO8601DateTime;
  tenantSignedAt?: ISO8601DateTime;
  agentSignedAt?: ISO8601DateTime;

  // Metadata
  createdAt: ISO8601DateTime;
  updatedAt: ISO8601DateTime;
  activatedAt?: ISO8601DateTime;
}

export interface AgreementClause {
  id: UUID;
  agreementId: UUID;
  type: 'pets' | 'smoking' | 'subletting' | 'maintenance' | 'custom';
  title: string;
  content: string;
  displayOrder: number;
}

export interface RentPayment {
  id: UUID;
  agreementId: UUID;

  // Payment details
  amount: string;
  currency: string;
  dueDate: ISO8601DateTime;
  paidDate?: ISO8601DateTime;

  // Splits
  landlordAmount: string;
  agentAmount: string;

  // Stellar transaction
  transactionHash?: TransactionHash;

  // Status
  status: 'pending' | 'paid' | 'late' | 'partial' | 'failed';
  lateFee?: string;

  // References
  paymentMonth: number; // 1-12
  paymentYear: number;
  paymentNumber: number; // Sequential number within agreement

  // Metadata
  createdAt: ISO8601DateTime;
  updatedAt: ISO8601DateTime;
}

export interface SecurityDeposit {
  id: UUID;
  agreementId: UUID;

  // Deposit details
  amount: string;
  currency: string;

  // Stellar references
  escrowAccountPubKey: StellarPublicKey;
  depositTxHash?: TransactionHash;
  releaseTxHash?: TransactionHash;

  // Status
  status: 'pending' | 'held' | 'released' | 'disputed' | 'returned';

  // Release details
  releaseAmount?: string;
  deductionAmount?: string;
  deductionReason?: string;
  releasedTo?: 'tenant' | 'landlord' | 'split';

  // Dates
  depositedAt?: ISO8601DateTime;
  releasedAt?: ISO8601DateTime;

  // Dispute
  disputeId?: UUID;

  createdAt: ISO8601DateTime;
  updatedAt: ISO8601DateTime;
}

export interface Dispute {
  id: UUID;
  disputeNumber: string;

  // Related entities
  agreementId: UUID;
  securityDepositId?: UUID;

  // Parties
  initiatedBy: 'tenant' | 'landlord';
  initiatorId: UUID;
  respondentId: UUID;

  // Dispute details
  type:
    | 'security_deposit'
    | 'property_damage'
    | 'lease_violation'
    | 'payment'
    | 'other';
  subject: string;
  description: string;
  requestedAmount?: string;

  // Evidence
  evidence: DisputeEvidence[];

  // Status
  status: 'open' | 'under_review' | 'resolved' | 'closed' | 'escalated';

  // Resolution
  resolution?: string;
  resolvedBy?: UUID; // Admin or mediator ID
  resolvedAt?: ISO8601DateTime;

  createdAt: ISO8601DateTime;
  updatedAt: ISO8601DateTime;
}

export interface DisputeEvidence {
  id: UUID;
  disputeId: UUID;
  uploadedBy: UUID;
  type: 'document' | 'image' | 'video' | 'message';
  url: string;
  description?: string;
  uploadedAt: ISO8601DateTime;
}
