'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { SkeletonCard } from '@/components/ui/SkeletonCard';
import { SubletList } from '@/components/sublet/SubletList';
import { useSubletRequests } from '@/lib/query/hooks/use-sublets';

export default function SubletManagePage() {
  const { data, isLoading } = useSubletRequests();
  const requests = data?.data ?? [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <Link
          href="/sublet"
          className="inline-flex items-center gap-2 text-blue-300/60 hover:text-white mb-8 transition-colors"
        >
          <ArrowLeft size={18} /> Back
        </Link>
        <h1 className="text-3xl font-bold mb-8">Manage Sublets</h1>

        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : (
          <SubletList requests={requests} emptyActionHref="/sublet/request" />
        )}
      </div>
    </div>
  );
}
