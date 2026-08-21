/**
 * Mock Lease Data for tests
 */

import type { Lease } from '@/components/leases/LeaseDetailsModal';

export const MOCK_LEASE_ACTIVE: Lease = {
  id: 'lease-1',
  property: '101 Park Avenue, Manhattan, NY',
  tenantName: 'John Doe',
  landlordName: 'Sarah Okafor',
  rentAmount: '$2,500',
  startDate: '2026-01-01',
  endDate: '2027-01-01',
  status: 'ACTIVE',
  terms: 'Standard lease agreement. Rent is due on the 1st of each month.',
};

export const MOCK_LEASE_PENDING: Lease = {
  id: 'lease-2',
  property: 'High Street Kensington, London',
  tenantName: 'Jane Smith',
  landlordName: 'David Ibrahim',
  rentAmount: '$3,800',
  startDate: '2026-06-01',
  endDate: '2027-06-01',
  status: 'PENDING',
  terms: 'Pending lease terms. Both parties need to sign.',
};

export const MOCK_LEASE_EXPIRED: Lease = {
  id: 'lease-3',
  property: 'Shibuya City, Tokyo',
  tenantName: 'Taro Yamada',
  landlordName: 'Chioma N.',
  rentAmount: '$1,500',
  startDate: '2025-01-01',
  endDate: '2026-01-01',
  status: 'EXPIRED',
  terms: 'Expired lease. No further obligations.',
};

export const MOCK_LEASES = [MOCK_LEASE_ACTIVE, MOCK_LEASE_PENDING, MOCK_LEASE_EXPIRED];