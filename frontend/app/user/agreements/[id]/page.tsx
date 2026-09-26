'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Calendar,
  FileText,
  Home,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { useAgreement } from '@/lib/query/hooks/use-agreements';

const AGREEMENT_PREVIEW_FALLBACK =
  'https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80';

export default function AgreementDetailsPage() {
  const params = useParams();
  const id = typeof params.id === 'string' ? params.id : '';
  const { data: agreement, isLoading, isError } = useAgreement(id);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh] text-blue-200/80">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-blue-400" />
          <p className="text-sm text-blue-200/60 font-medium">
            Loading agreement details…
          </p>
        </div>
      </div>
    );
  }

  if (isError || !agreement) {
    return (
      <div className="flex items-center justify-center min-h-[40vh] text-blue-200/80">
        <div className="flex flex-col items-center space-y-4">
          <AlertCircle className="w-10 h-10 text-rose-400" />
          <p className="text-sm text-rose-300/80 font-medium">
            Failed to load agreement.
          </p>
          <Link
            href="/user"
            className="inline-flex items-center gap-2 text-sm font-bold text-blue-300 hover:text-white transition-colors"
          >
            <ArrowLeft size={16} />
            Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  const statusLabel =
    agreement.status === 'active'
      ? 'Active'
      : agreement.status === 'pending'
        ? 'Pending'
        : agreement.status === 'signed'
          ? 'Signed'
          : agreement.status === 'terminated'
            ? 'Terminated'
            : (agreement.status ?? 'Unknown');

  const imageUrl = AGREEMENT_PREVIEW_FALLBACK;

  return (
    <div className="space-y-6">
      <Link
        href="/user"
        className="inline-flex items-center gap-2 text-sm font-bold text-blue-300 hover:text-white transition-colors"
      >
        <ArrowLeft size={16} />
        Back to dashboard
      </Link>

      <section className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-xl">
        <div className="relative min-h-[300px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt={`${agreement.displayTitle ?? id} agreement preview`}
            className="absolute inset-0 h-full w-full object-cover"
            referrerPolicy="no-referrer"
            onError={(e) => {
              e.currentTarget.src = AGREEMENT_PREVIEW_FALLBACK;
            }}
          />
          <div className="absolute inset-0 bg-slate-950/65" />
          <div className="relative z-10 flex min-h-[300px] flex-col justify-end p-6 sm:p-8">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-200/60">
              Agreement Details
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">
              {id}
            </h1>
            <p className="mt-1 text-sm text-blue-200/70">
              {agreement.displayTitle ?? ''}
            </p>
          </div>
        </div>
        <div className="grid gap-4 p-6 sm:grid-cols-3 sm:p-8">
          <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
            <div className="mb-2 flex items-center gap-2 text-blue-200/60">
              <FileText size={16} />
              <span className="text-[10px] font-bold uppercase tracking-widest">
                Rent
              </span>
            </div>
            <p className="text-xl font-bold text-white">
              ${(agreement.monthlyRent ?? 0).toLocaleString()}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
            <div className="mb-2 flex items-center gap-2 text-blue-200/60">
              <Calendar size={16} />
              <span className="text-[10px] font-bold uppercase tracking-widest">
                End Date
              </span>
            </div>
            <p className="text-xl font-bold text-white">
              {agreement.endDate
                ? new Date(agreement.endDate).toLocaleDateString()
                : '—'}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
            <div className="mb-2 flex items-center gap-2 text-blue-200/60">
              <Home size={16} />
              <span className="text-[10px] font-bold uppercase tracking-widest">
                Status
              </span>
            </div>
            <p className="text-xl font-bold text-white">{statusLabel}</p>
          </div>
        </div>

        {(agreement.tenantName || agreement.landlordName) && (
          <div className="border-t border-white/10 p-6 sm:p-8">
            <h3 className="text-md font-bold text-white mb-4">Parties</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              {agreement.landlordName && (
                <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-blue-200/60">
                    Landlord
                  </span>
                  <p className="text-lg font-bold text-white mt-1">
                    {agreement.landlordName}
                  </p>
                </div>
              )}
              {agreement.tenantName && (
                <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-blue-200/60">
                    Tenant
                  </span>
                  <p className="text-lg font-bold text-white mt-1">
                    {agreement.tenantName}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
