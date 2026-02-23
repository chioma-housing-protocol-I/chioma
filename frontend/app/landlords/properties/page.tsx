'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Home } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonCard } from '@/components/ui/SkeletonCard';
import PropertiesTable from '@/components/landlord-dashboard/PropertiesTable';

export default function PropertiesPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [properties, setProperties] = useState([]);

  useEffect(() => {
    // Simulated mock fetch from /api/properties/my-properties
    const fetchProperties = async () => {
      // Mock delay
      await new Promise((resolve) => setTimeout(resolve, 800));

      const mockData = [
        {
          id: 'prop-1',
          title: 'Sunset View Apartments',
          address: '123 Coastal Highway, CA',
          status: 'active',
          monthlyRent: 4500,
          tenants: 2,
        },
        {
          id: 'prop-2',
          title: 'Downtown Retail Space',
          address: '450 Main St, NY',
          status: 'vacant',
          monthlyRent: 8000,
          tenants: 0,
        },
        {
          id: 'prop-3',
          title: 'Pine Tree Townhouse',
          address: '77 Forest Drive, WA',
          status: 'maintenance',
          monthlyRent: 2200,
          tenants: 1,
        },
      ];
      setProperties(mockData as unknown as never[]);
      setIsLoading(false);
    };

    fetchProperties();
    // Simulate loading
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">
            Your Properties
          </h1>
          <p className="text-neutral-500 mt-1">
            Manage and monitor all your properties
          </p>
        </div>
        <Link
          href="/landlords/properties/add"
          className="flex items-center justify-center space-x-2 px-6 py-3 bg-brand-blue text-white font-semibold rounded-lg hover:bg-brand-blue-dark transition-all shadow-sm shadow-brand-blue/20 hover:shadow-brand-blue/30"
        >
          <Plus size={20} />
          <span>Add Property</span>
        </Link>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : properties.length === 0 ? (
        <EmptyState
          icon={Home}
          title="No Properties Found"
          description="Start by adding your first property to manage rentals and track performance."
          actionLabel="Add Your First Property"
          onAction={() => router.push('/landlords/properties/add')}
        />
      ) : (
        <div className="pt-2">
          <PropertiesTable properties={properties} />
        </div>
      )}
    </div>
  );
}
