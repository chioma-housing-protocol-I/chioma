/**
 * Shared test fixtures for the lease negotiation and signing components
 * (LeaseList, LeaseDetailsModal, NegotiationSidebar, SignaturePad — #1552).
 *
 * Co-located here rather than under `frontend/mocks/` because this
 * project's ESLint config (`eslint.config.mjs`) blocks any import from
 * the mocks directory inside components, including test files, since its
 * glob pattern does not exclude __tests__ subdirectories, with the
 * explicit guidance "keep mocks in tests". This file is that: fixtures
 * reused across this directory's test files instead of duplicated inline
 * in each one.
 */

import type {
  Contract,
  NegotiationOffer,
  NegotiationMessage,
} from '@/types/contracts';
import type { Lease } from '../LeaseDetailsModal';

export const MOCK_LEASE_CONTRACT: Contract = {
  id: 'lease-1',
  propertyName: 'Sunset Apartments',
  propertyAddress: '123 Main St',
  landlord: { name: 'John Landlord', walletAddress: '', role: 'ADMIN' },
  tenant: { name: 'Jane Tenant', walletAddress: '', role: 'USER' },
  agent: { name: '', walletAddress: '', role: 'USER' },
  rentAmount: '2000',
  securityDeposit: '2000',
  commissionRate: '0',
  startDate: '2026-01-01',
  endDate: '2026-12-31',
  status: 'PENDING',
  stage: 'DRAFTED',
  stellarTxHash: '',
  createdAt: '',
  terms: 'Standard terms',
};

export const MOCK_NEGOTIATION_OFFERS: NegotiationOffer[] = [
  {
    id: 'off-1',
    contractId: 'lease-1',
    proposerRole: 'LANDLORD',
    rentAmount: '2000',
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    message: 'Initial offer',
    status: 'PENDING',
    createdAt: new Date('2026-01-01T00:00:00Z').toISOString(),
  },
];

export const MOCK_NEGOTIATION_MESSAGES: NegotiationMessage[] = [
  {
    id: 'msg-1',
    senderId: 'landlord-1',
    senderName: 'John Landlord',
    content: 'Hello there',
    createdAt: new Date('2026-01-01T00:00:00Z').toISOString(),
  },
];

export const MOCK_LEASES: Lease[] = [
  {
    id: 'lease-1',
    property: 'Sunset Apartments - Unit 4B',
    tenantName: 'Jane Tenant',
    landlordName: 'John Landlord',
    rentAmount: '$24,000',
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    status: 'ACTIVE',
    terms: 'Standard lease terms and conditions apply.',
  },
  {
    id: 'lease-2',
    property: 'Riverside Lofts - Unit 2A',
    tenantName: 'Michael Renter',
    landlordName: 'Grace Owner',
    rentAmount: '$18,000',
    startDate: '2026-03-01',
    endDate: '2027-02-28',
    status: 'PENDING',
    terms: 'Standard lease terms and conditions apply.',
  },
  {
    id: 'lease-3',
    property: 'Old Town House - Unit 1',
    tenantName: 'Sam Former',
    landlordName: 'Grace Owner',
    rentAmount: '$15,000',
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    status: 'EXPIRED',
    terms: 'Standard lease terms and conditions apply.',
  },
];
