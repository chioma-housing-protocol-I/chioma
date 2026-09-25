'use client';

import Link from 'next/link';
import { ArrowLeft, Flag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/authStore';
import { Suspense } from 'react';
import { DisputeDetail } from '@/components/user/DisputeDetail';
import { useParams } from 'next/navigation';

export default function TenantDisputeDetailPage() {
  const params = useParams();
  const id = params.id as string;
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
          <Flag className="w-20 h-20 text-blue-400 mx-auto mb-6 opacity-75" />
          <h1 className="text-3xl font-bold mb-4">Access Denied</h1>
          <p className="text-xl mb-8 text-blue-200/80">
            Dispute details are private to tenants.
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
    <div className="max-w-6xl mx-auto">
      {/* Breadcrumb */}
      <div className="mb-12 flex items-center text-sm text-neutral-400 space-x-2">
        <Link
          href="/user/disputes"
          className="hover:text-white transition-colors flex items-center gap-1"
        >
          <ArrowLeft size={16} />
          All Disputes
        </Link>
        <span>→</span>
        <span className="font-semibold text-white">
          #{id.slice(-8).toUpperCase()}
        </span>
      </div>

      <Suspense
        key={id}
        fallback={
          <div className="bg-white/20 backdrop-blur-xl rounded-3xl p-12 border border-white/20 flex items-center justify-center">
            Loading dispute details...
          </div>
        }
      >
        <DisputeDetail disputeId={id} />
      </Suspense>
    </div>
  );
}
