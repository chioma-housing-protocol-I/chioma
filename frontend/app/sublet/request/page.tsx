'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { SubletRequestForm } from '@/components/sublet/SubletRequestForm';
import {
  useCreateSubletRequest,
  type CreateSubletRequestPayload,
} from '@/lib/query/hooks/use-sublets';

export default function SubletRequestPage() {
  const router = useRouter();
  const createSubletRequest = useCreateSubletRequest();

  const handleSubmit = async (payload: CreateSubletRequestPayload) => {
    try {
      await createSubletRequest.mutateAsync(payload);
      toast.success('Sublet request submitted');
      router.push('/sublet/manage');
    } catch {
      toast.error('Failed to submit request');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white px-4 py-8">
      <div className="max-w-lg mx-auto">
        <Link
          href="/sublet"
          className="inline-flex items-center gap-2 text-blue-300/60 hover:text-white mb-8 transition-colors"
        >
          <ArrowLeft size={18} /> Back
        </Link>
        <h1 className="text-3xl font-bold mb-2">Request Subletting Approval</h1>
        <p className="text-blue-300/60 mb-8">
          Submit a request to sublet your rental to another guest
        </p>

        <div className="backdrop-blur-xl bg-slate-800/50 border border-white/10 rounded-2xl p-6">
          <SubletRequestForm
            onSubmit={handleSubmit}
            isSubmitting={createSubletRequest.isPending}
          />
        </div>
      </div>
    </div>
  );
}
