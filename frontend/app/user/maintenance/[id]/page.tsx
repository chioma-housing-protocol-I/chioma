'use client';

import Link from 'next/link';
import { ArrowLeft, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/authStore';
import { MaintenanceDetail } from '@/components/user/MaintenanceDetail';
import { Suspense } from 'react';
import { Breadcrumb } from '@/components/common/Breadcrumb';

interface MaintenanceDetailPageProps {
  params: {
    id: string;
  };
}

export default function MaintenanceDetailPage({
  params,
}: MaintenanceDetailPageProps) {
  const { user, isAuthenticated, loading } = useAuthStore();

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
          <Wrench className="w-20 h-20 text-blue-400 mx-auto mb-6 opacity-75" />
          <h1 className="text-3xl font-bold mb-4">Access Denied</h1>
          <p className="text-xl mb-8 text-blue-200/80">
            Maintenance management is only available to verified landlords.
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
    <>
      <Breadcrumb
        backHref="/user/maintenance"
        backLabel="Back to List"
        homeHref="/user"
        homeLabel="Dashboard"
        customLabels={{
          [params.id]: 'Request Details',
        }}
        className="mb-8"
      />

      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white mb-2">
              Maintenance Request Details
            </h1>
            <p className="text-xl text-blue-100">
              View and manage this maintenance request
            </p>
          </div>
          <Button
            asChild
            variant="outline"
            className="bg-white/10 border-white/20 text-white hover:bg-white/20"
          >
            <Link href="/user/maintenance">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to List
            </Link>
          </Button>
        </div>

        <Suspense
          fallback={
            <div className="bg-white/20 backdrop-blur-xl rounded-3xl p-12 border border-white/20 flex items-center justify-center">
              Loading maintenance request details...
            </div>
          }
        >
          <MaintenanceDetail requestId={params.id} />
        </Suspense>
      </div>
    </>
  );
}
