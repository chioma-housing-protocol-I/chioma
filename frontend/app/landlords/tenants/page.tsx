'use client';
import { useState, useEffect } from 'react';
import { Users, Star, UserCheck, Phone, Mail } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonCard } from '@/components/ui/SkeletonCard';
import { ReviewForm, ReviewFormData } from '@/components/reviews/ReviewForm';
import { StarRatingInput } from '@/components/reviews/StarRatingInput';
import Image from 'next/image';

interface Tenant {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar: string;
  property: string;
  leaseEnd: string;
  averageRating: number | null;
}

const MOCK_TENANTS: Tenant[] = [
  {
    id: 't1',
    name: 'Michael T.',
    email: 'michael.t@example.com',
    phone: '+234 801 234 5678',
    avatar:
      'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=100&h=100&fit=crop',
    property: 'Luxury 2-Bed Apartment',
    leaseEnd: '2024-12-31',
    averageRating: 4.8,
  },
  {
    id: 't2',
    name: 'Sarah Johnson',
    email: 'sarah.j@example.com',
    phone: '+234 802 345 6789',
    avatar:
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
    property: 'Modern Loft in Lekki',
    leaseEnd: '2025-06-30',
    averageRating: null,
  },
];

export default function TenantsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [ratingTenantId, setRatingTenantId] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setTenants(MOCK_TENANTS);
      setIsLoading(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  const handleRateSubmit = async (tenantId: string, data: ReviewFormData) => {
    // Simulate API call
    await new Promise((res) => setTimeout(res, 800));
    setTenants((prev) =>
      prev.map((t) =>
        t.id === tenantId ? { ...t, averageRating: data.rating } : t,
      ),
    );
    setRatingTenantId(null);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-3xl font-black text-neutral-900 tracking-tight">
            My Tenants
          </h1>
          <p className="text-neutral-500 mt-2 text-lg">
            Manage your tenants and build their reputation
          </p>
        </div>
        <div className="px-4 py-2 bg-blue-50 text-brand-blue rounded-xl font-bold flex items-center gap-2 border border-blue-100">
          <UserCheck className="w-5 h-5" />
          <span>{tenants.length} Active Tenants</span>
        </div>
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {tenants.map((tenant) => (
            <div
              key={tenant.id}
              className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-xs hover:shadow-md transition-shadow"
            >
              <div className="p-6 border-b border-gray-50 flex items-start gap-5">
                <div className="w-16 h-16 rounded-full overflow-hidden shrink-0 border-2 border-gray-50">
                  <Image
                    src={tenant.avatar}
                    alt={tenant.name}
                    width={64}
                    height={64}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-1">
                    {tenant.name}
                  </h3>
                  <p className="text-sm font-medium text-brand-blue mb-2">
                    {tenant.property}
                  </p>

                  {tenant.averageRating ? (
                    <div className="flex items-center gap-2">
                      <StarRatingInput
                        value={Math.round(tenant.averageRating)}
                        onChange={() => {}}
                        readOnly
                        size="sm"
                      />
                      <span className="text-xs font-bold text-gray-600">
                        {tenant.averageRating} Avg
                      </span>
                    </div>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      No ratings yet
                    </span>
                  )}
                </div>
                {!ratingTenantId && tenant.id !== ratingTenantId && (
                  <button
                    onClick={() => setRatingTenantId(tenant.id)}
                    className="px-4 py-2 bg-white border border-gray-200 hover:border-brand-blue hover:text-brand-blue text-sm font-bold rounded-xl transition-colors shadow-xs"
                  >
                    Rate
                  </button>
                )}
              </div>

              {ratingTenantId === tenant.id ? (
                <div className="p-6 bg-gray-50/50 animate-in fade-in slide-in-from-top-4">
                  <h4 className="font-bold text-gray-900 mb-4">
                    Rate {tenant.name}
                  </h4>
                  <ReviewForm
                    onSubmit={async (data) => handleRateSubmit(tenant.id, data)}
                    onCancel={() => setRatingTenantId(null)}
                  />
                </div>
              ) : (
                <div className="p-6 bg-gray-50/30 flex items-center justify-between text-sm">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Mail className="w-4 h-4" />
                      {tenant.email}
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <Phone className="w-4 h-4" />
                      {tenant.phone}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="block text-xs text-gray-500 font-medium mb-1">
                      Lease Ends
                    </span>
                    <span className="font-bold text-gray-900">
                      {new Date(tenant.leaseEnd).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
