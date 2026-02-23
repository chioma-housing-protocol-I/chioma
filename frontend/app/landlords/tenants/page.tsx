'use client';

import { useState, useEffect } from 'react';
import { Users } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonCard } from '@/components/ui/SkeletonCard';

export default function TenantsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [tenants, setTenants] = useState([]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Tenants</h1>
        <p className="text-neutral-500 mt-1">
          Manage all your tenants and their lease agreements
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : tenants.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No Tenants Found"
          description="You currently don't have any tenants assigned to your properties."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Tenants list */}
        </div>
      )}
    </div>
  );
}
