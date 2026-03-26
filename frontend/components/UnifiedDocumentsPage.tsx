// UnifiedDocumentsPage.tsx
'use client';

import { useState } from 'react';
import { LeaseList } from '@/components/leases/LeaseList';
import type { Lease } from '@/components/leases/LeaseDetailsModal';

interface UnifiedDocumentsPageProps {
  leases: Lease[];
  icon?: React.ReactNode;
  userRole?: 'tenant' | 'landlord' | 'dashboard';
}

export default function UnifiedDocumentsPage({ leases }: UnifiedDocumentsPageProps) {
  const [currentLeases, setLeases] = useState<Lease[]>(leases);

  const handleSignComplete = async (leaseId: string) => {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setLeases((prev) => prev.map(l => l.id === leaseId ? { ...l, status: 'SIGNED' } : l));
  };

  return (
    <div>
      <LeaseList leases={currentLeases} onSignComplete={handleSignComplete} />
    </div>
  );
}
