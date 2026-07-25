'use client';

import Link from 'next/link';
import { ArrowLeft, Loader2, Mail, User } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useAgreement } from '@/lib/query/hooks/use-agreements';

export default function TenantProfilePage() {
  const params = useParams();
  const tenantId = params.id as string;
  const { data: agreement, isLoading, error } = useAgreement(tenantId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh] gap-3 text-blue-200/60">
        <Loader2 className="w-6 h-6 animate-spin" />
        Loading tenant profile...
      </div>
    );
  }

  if (error || !agreement) {
    return (
      <div className="max-w-lg mx-auto text-center py-16">
        <p className="text-white font-semibold mb-2">Tenant not found</p>
        <p className="text-blue-200/50 text-sm mb-6">
          No agreement matches this tenant reference.
        </p>
        <Link
          href="/user/tenants"
          className="text-blue-400 hover:text-blue-300"
        >
          ← Back to tenants
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link
        href="/user/tenants"
        className="inline-flex items-center gap-2 text-sm text-blue-200/60 hover:text-white"
      >
        <ArrowLeft className="w-4 h-4" />
        All tenants
      </Link>

      <div className="bg-white/5 border border-white/10 rounded-3xl p-8">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-14 h-14 rounded-2xl bg-blue-500/20 flex items-center justify-center">
            <User className="w-7 h-7 text-blue-300" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">
              {agreement.tenantName}
            </h1>
            <p className="text-blue-200/50 mt-1">{agreement.displayTitle}</p>
          </div>
        </div>

        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div className="bg-white/5 rounded-xl p-4">
            <dt className="text-blue-300/40 uppercase tracking-wider text-xs mb-1">
              Agreement
            </dt>
            <dd className="text-white font-mono">{agreement.id}</dd>
          </div>
          <div className="bg-white/5 rounded-xl p-4">
            <dt className="text-blue-300/40 uppercase tracking-wider text-xs mb-1">
              Status
            </dt>
            <dd className="text-white capitalize">
              {agreement.status ?? 'unknown'}
            </dd>
          </div>
          <div className="bg-white/5 rounded-xl p-4">
            <dt className="text-blue-300/40 uppercase tracking-wider text-xs mb-1">
              Monthly rent
            </dt>
            <dd className="text-emerald-400 font-semibold">
              {agreement.monthlyRent != null
                ? `$${agreement.monthlyRent.toLocaleString()}`
                : '—'}
            </dd>
          </div>
          <div className="bg-white/5 rounded-xl p-4">
            <dt className="text-blue-300/40 uppercase tracking-wider text-xs mb-1">
              Landlord
            </dt>
            <dd className="text-white">{agreement.landlordName}</dd>
          </div>
        </dl>

        {agreement.tenant?.email && (
          <p className="mt-6 flex items-center gap-2 text-blue-200/70">
            <Mail className="w-4 h-4" />
            {agreement.tenant.email}
          </p>
        )}

        <div className="mt-8 flex gap-3">
          <Link
            href={`/user/agreements/${agreement.id}`}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold"
          >
            View agreement
          </Link>
          <Link
            href={`/user/messages?agreement=${agreement.id}`}
            className="px-4 py-2 rounded-xl border border-white/10 text-white text-sm font-semibold hover:bg-white/5"
          >
            Message tenant
          </Link>
        </div>
      </div>
    </div>
  );
}
