'use client';

import { useState } from 'react';
import { LeaseList } from '@/components/leases/LeaseList';
import type { Lease } from '@/components/leases/LeaseDetailsModal';
import { PenTool } from 'lucide-react';

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

export default function TenantDocumentsPage() {
  const [leases, setLeases] = useState<Lease[]>(MOCK_LEASES);

  const handleSignComplete = async (leaseId: string) => {
    // In a real app, you would make an API call to sign the lease
    // Here we simulate the process
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setLeases((prevLeases) =>
      prevLeases.map((lease) =>
        lease.id === leaseId ? { ...lease, status: 'ACTIVE' } : lease,
      ),
    );
  };

  const pendingCount = leases.filter((l) => l.status === 'PENDING').length;

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-3xl font-black text-neutral-900 tracking-tight">
            My Documents
          </h1>
          <p className="text-neutral-500 mt-2 text-lg">
            Review and digitally sign your lease agreements.
          </p>
        </div>
        {pendingCount > 0 && (
          <div className="px-4 py-2 bg-brand-blue/10 text-brand-blue rounded-xl font-bold flex items-center gap-2 border border-brand-blue/20">
            <PenTool className="w-5 h-5 animate-pulse" />
            <span>{pendingCount} Action Required</span>
          </div>
        )}
      </div>

      <LeaseList
        leases={leases}
        currentUserRole="TENANT"
        onSignComplete={handleSignComplete}
      />
    </div>
  );
}
