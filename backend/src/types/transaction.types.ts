// backend/src/types/transaction.types.ts

import {
  UUID,
  ISO8601DateTime,
  TransactionHash,
  StellarPublicKey,
} from './common.types';
import { StellarAssetInfo } from './stellar.types';

export type TransactionType =
  | 'rent_payment'
  | 'security_deposit'
  | 'deposit_release'
  | 'agent_commission'
  | 'refund';
export type TransactionStatus =
  'pending' | 'confirmed' | 'failed' | 'cancelled';

export interface IndexedTransaction {
  id: UUID;

  // Stellar transaction data
  transactionHash: TransactionHash;
  ledger: number;
  ledgerCloseTime: ISO8601DateTime;
  successful: boolean;

  // Transaction classification
  transactionType: TransactionType;

  // Parties
  sourceAccount: StellarPublicKey;
  destinationAccount?: StellarPublicKey;

  // Financial details
  amount: string;
  assetCode: string;
  assetIssuer?: StellarPublicKey;
  fee: string;

  // Reference
  memo?: string;
  memoType?: 'text' | 'id' | 'hash';

  // Chioma-specific references
  agreementId?: UUID;
  propertyId?: UUID;
  paymentId?: UUID;
  depositId?: UUID;

  // Additional data
  operations: OperationRecord[];
  metadata: Record<string, any>;

  // Indexing metadata
  indexed: boolean;
  indexedAt?: ISO8601DateTime;

  createdAt: ISO8601DateTime;
}

export interface OperationRecord {
  id: string;
  type: string;
  transactionHash: TransactionHash;
  sourceAccount: StellarPublicKey;

  // Type-specific data
  amount?: string;
  asset?: StellarAssetInfo;
  from?: StellarPublicKey;
  to?: StellarPublicKey;

  // Additional operation data
  data: Record<string, any>;
}

export interface BalanceStatus {
  account: StellarPublicKey;
  asset: StellarAssetInfo;
  balance: string;
  availableBalance: string;
  reservedBalance: string;
  isLow: boolean;
  threshold?: string;
  lastChecked: ISO8601DateTime;
}

export interface PaymentValidation {
  valid: boolean;
  transactionHash: TransactionHash;
  amount: string;
  expectedAmount: string;
  from: StellarPublicKey;
  to: StellarPublicKey;
  asset: StellarAssetInfo;
  timestamp: ISO8601DateTime;
  errors?: string[];
}
