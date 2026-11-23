'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/authStore';
import { Suspense } from 'react';
import { ReviewForm } from '@/components/reviews/ReviewForm';
import { Breadcrumb } from '@/components/common/Breadcrumb';

interface Params {
  params: Promise<{ id: string }>;
}

export default function TenantReviewDetailPage({ params }: Params) {
  const { user, isAuthenticated, loading } = useAuthStore();
  const [id, setId] = React.useState<string>('');

  React.useEffect(() => {
    params.then(({ id }) => setId(id));
  }, [params]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== 'user') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-8">
        <div className="max-w-md text-center text-white">
          <h1 className="text-3xl font-bold mb-4">Access Denied</h1>
          <p className="text-xl mb-8 text-blue-200/80">
            Review management is tenant-only.
          </p>
          <Link href="/">
            <Button className="bg-white text-neutral-900 hover:bg-neutral-100 font-semibold px-8 h-12 text-lg">
              Connect Wallet
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Breadcrumb
        backHref="/user/reviews"
        backLabel="All Reviews"
        homeHref="/user"
        homeLabel="Dashboard"
        customLabels={{
          [id]: id ? `#${id.slice(-8).toUpperCase()}` : 'Review Details',
        }}
        className="mb-8"
      />

      <Suspense
        key={id}
        fallback={
          <div className="bg-white/20 backdrop-blur-xl rounded-3xl p-12 border border-white/20 flex items-center justify-center">
            Loading review...
          </div>
        }
      >
        <ReviewForm reviewId={id} />
      </Suspense>
    </div>
  );
}
