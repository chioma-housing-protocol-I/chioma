'use client';

import { useState } from 'react';
import { LeaseList } from '@/components/leases/LeaseList';
import type { Lease } from '@/components/leases/LeaseDetailsModal';
import { PenTool } from 'lucide-react';
import UnifiedDocumentsPage from '@/components/UnifiedDocumentsPage';

const MOCK_LEASES: Lease[] = [
  {
    id: 'l2',
    property: 'Modern Loft in Lekki',
    tenantName: 'Sarah Johnson', // Current User
    landlordName: 'Sarah Okafor',
    rentAmount: '₦3,800,000',
    startDate: '2024-07-01',
    endDate: '2025-06-30',
    status: 'PENDING',
    terms:
      '1. Rent payment frequency: Bi-annual.\n2. Pet policy: 1 small pet allowed.\n3. Noise restrictions apply between 10 PM and 7 AM.\n4. The landlord handles major plumbing maintenance.\n5. Eviction notice is strictly 30 days.',
  },
  {
    id: 'l4',
    property: '1-Bed Flat Surulere',
    tenantName: 'Sarah Johnson',
    landlordName: 'David Ibrahim',
    rentAmount: '₦1,200,000',
    startDate: '2022-05-01',
    endDate: '2023-04-30',
    status: 'EXPIRED',
    terms: '1. Standard terms apply.\n2. No pets allowed.',
  },
];

export default function DashboardDocumentsPage() {
  return <UnifiedDocumentsPage leases={MOCK_LEASES} />;
}
