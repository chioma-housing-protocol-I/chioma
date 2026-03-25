'use client';

import { useState } from 'react';
import { LeaseList } from '@/components/leases/LeaseList';
import type { Lease } from '@/components/leases/LeaseDetailsModal';
import { FileSignature } from 'lucide-react';

const MOCK_LEASES: Lease[] = [
  {
    id: 'l1',
    property: 'Luxury 2-Bed Apartment',
    tenantName: 'Michael T.',
    landlordName: 'Sarah Okafor',
    rentAmount: '₦2,500,000',
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    status: 'ACTIVE',
    terms:
      '1. Rent to be paid annually.\n2. Tenant is responsible for utility bills.\n3. No structural modifications allowed without prior written consent.\n4. Security deposit of 200,000 NGN is required before move-in.\n5. Subletting is strictly prohibited.',
  },
  {
    id: 'l2',
    property: 'Modern Loft in Lekki',
    tenantName: 'Sarah Johnson',
    landlordName: 'Sarah Okafor',
    rentAmount: '₦3,800,000',
    startDate: '2024-07-01',
    endDate: '2025-06-30',
    status: 'PENDING',
    terms:
      '1. Rent payment frequency: Bi-annual.\n2. Pet policy: 1 small pet allowed.\n3. Noise restrictions apply between 10 PM and 7 AM.\n4. The landlord handles major plumbing maintenance.\n5. Eviction notice is strictly 30 days.',
  },
  {
    id: 'l3',
    property: 'Cozy Studio Yaba',
    tenantName: 'John Doe',
    landlordName: 'Sarah Okafor',
    rentAmount: '₦800,000',
    startDate: '2023-01-01',
    endDate: '2023-12-31',
    status: 'EXPIRED',
    terms:
      '1. Rent is non-refundable upon early termination.\n2. Normal wear and tear accepted.\n3. Final inspection required before deposit return.',
  },
];

export default function LandlordDocumentsPage() {
  const [leases] = useState<Lease[]>(MOCK_LEASES);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-300 to-indigo-300 bg-clip-text text-transparent">
            Lease Agreements
          </h1>
          <p className="text-sm text-blue-200/60 font-medium mt-1">
            Manage your property documents and track signature statuses.
          </p>
        </div>
        <div className="bg-white/5 border border-white/10 backdrop-blur-sm rounded-2xl px-5 py-3 flex items-center gap-3 shadow-xl">
          <div className="p-2 rounded-xl bg-blue-500/20 border border-blue-500/30">
            <FileSignature className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <p className="text-[10px] text-blue-300/40 font-bold tracking-widest uppercase">
              Action Required
            </p>
            <p className="text-sm font-bold text-white">
              {leases.filter((l) => l.status === 'PENDING').length} Pending
              Signatures
            </p>
          </div>
        </div>
      </div>

      <LeaseList leases={leases} currentUserRole="LANDLORD" />
    </div>
  );
}
