/**
 * Static transaction data for Transaction & Payment History.
 * Replace with API data when backend is connected.
 */

export type TransactionType = 'Rent' | 'Deposit' | 'Refund' | 'Service Fee';
export type TransactionStatus = 'Pending' | 'Completed' | 'Failed';

export interface Transaction {
  id: string;
  date: string; // ISO
  type: TransactionType;
  amount: number;
  currency: string;
  amountUsd?: number; // conversion for display
  status: TransactionStatus;
  propertyId: string;
  propertyName: string;
  txHash: string | null; // Stellar transaction hash
  description?: string;
  isSecurityDeposit?: boolean;
  securityDepositId?: string; // links deposit to refund
}

const STELLAR_EXPLORER_BASE = 'https://stellar.expert/explorer/public/tx';

export function getStellarExplorerUrl(txHash: string): string {
  return `${STELLAR_EXPLORER_BASE}/${txHash}`;
}

export const MOCK_TRANSACTIONS: Transaction[] = [
  {
    id: 'tx-1',
    date: '2025-02-20T14:32:00Z',
    type: 'Rent',
    amount: 2400,
    currency: 'XLM',
    amountUsd: 480,
    status: 'Completed',
    propertyId: 'prop-1',
    propertyName: 'Sunset View Apartments',
    txHash: 'a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456',
    description: 'February 2025 rent',
  },
  {
    id: 'tx-2',
    date: '2025-02-18T09:15:00Z',
    type: 'Deposit',
    amount: 4800,
    currency: 'XLM',
    amountUsd: 960,
    status: 'Completed',
    propertyId: 'prop-1',
    propertyName: 'Sunset View Apartments',
    txHash: 'b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef12345678',
    description: 'Security deposit',
    isSecurityDeposit: true,
    securityDepositId: 'sd-1',
  },
  {
    id: 'tx-3',
    date: '2025-02-15T11:00:00Z',
    type: 'Service Fee',
    amount: 24,
    currency: 'USD',
    status: 'Completed',
    propertyId: 'prop-1',
    propertyName: 'Sunset View Apartments',
    txHash: null,
    description: 'Platform fee (1%)',
  },
  {
    id: 'tx-4',
    date: '2025-02-12T16:45:00Z',
    type: 'Rent',
    amount: 8000,
    currency: 'XLM',
    amountUsd: 1600,
    status: 'Completed',
    propertyId: 'prop-2',
    propertyName: 'Downtown Retail Space',
    txHash: 'c3d4e5f6789012345678901234567890abcdef1234567890abcdef1234567890',
    description: 'February 2025 rent',
  },
  {
    id: 'tx-5',
    date: '2025-02-10T08:30:00Z',
    type: 'Refund',
    amount: 960,
    currency: 'USD',
    status: 'Completed',
    propertyId: 'prop-3',
    propertyName: 'Pine Tree Townhouse',
    txHash: 'd4e5f6789012345678901234567890abcdef1234567890abcdef123456789012',
    description: 'Security deposit refund',
    isSecurityDeposit: true,
    securityDepositId: 'sd-2',
  },
  {
    id: 'tx-6',
    date: '2025-02-08T13:20:00Z',
    type: 'Rent',
    amount: 2200,
    currency: 'XLM',
    amountUsd: 440,
    status: 'Pending',
    propertyId: 'prop-3',
    propertyName: 'Pine Tree Townhouse',
    txHash: null,
    description: 'March 2025 rent (scheduled)',
  },
  {
    id: 'tx-7',
    date: '2025-02-05T10:00:00Z',
    type: 'Deposit',
    amount: 4400,
    currency: 'XLM',
    amountUsd: 880,
    status: 'Completed',
    propertyId: 'prop-3',
    propertyName: 'Pine Tree Townhouse',
    txHash: 'e5f6789012345678901234567890abcdef1234567890abcdef12345678901234',
    description: 'Security deposit',
    isSecurityDeposit: true,
    securityDepositId: 'sd-2',
  },
  {
    id: 'tx-8',
    date: '2025-02-01T00:05:00Z',
    type: 'Rent',
    amount: 1500,
    currency: 'USD',
    status: 'Failed',
    propertyId: 'prop-4',
    propertyName: 'Riverside Studio',
    txHash: null,
    description: 'February 2025 rent - insufficient funds',
  },
  {
    id: 'tx-9',
    date: '2025-01-28T14:00:00Z',
    type: 'Service Fee',
    amount: 80,
    currency: 'USD',
    status: 'Completed',
    propertyId: 'prop-2',
    propertyName: 'Downtown Retail Space',
    txHash: null,
    description: 'Platform fee (1%)',
  },
  {
    id: 'tx-10',
    date: '2025-01-25T09:30:00Z',
    type: 'Deposit',
    amount: 3200,
    currency: 'XLM',
    amountUsd: 640,
    status: 'Completed',
    propertyId: 'prop-4',
    propertyName: 'Riverside Studio',
    txHash: 'f6789012345678901234567890abcdef1234567890abcdef1234567890123456',
    description: 'Security deposit',
    isSecurityDeposit: true,
    securityDepositId: 'sd-3',
  },
];

/** Active security deposits (not yet refunded). */
export const MOCK_ACTIVE_DEPOSITS = MOCK_TRANSACTIONS.filter(
  (t) =>
    t.isSecurityDeposit && t.type === 'Deposit' && t.status === 'Completed',
).map((t) => ({
  ...t,
  tenantName: 'Tenant', // would come from API
  expectedRefundDate: null as string | null,
}));
