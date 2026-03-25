'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { format } from 'date-fns';
import {
  AlertTriangle,
  FileStack,
  Gavel,
  MessageSquareText,
} from 'lucide-react';
import { useAuth } from '@/store/authStore';
import {
  type DashboardDispute,
  loadLandlordDisputes,
} from '@/lib/dashboard-data';

const statusStyles: Record<DashboardDispute['status'], string> = {
  OPEN: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  UNDER_REVIEW: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  RESOLVED: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  REJECTED: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  WITHDRAWN: 'bg-white/5 text-blue-200/40 border-white/5',
};

export default function LandlordDisputesPage() {
  const { user } = useAuth();
  const [disputes, setDisputes] = useState<DashboardDispute[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const run = async () => {
      setLoading(true);
      const nextDisputes = await loadLandlordDisputes();
      if (active) {
        setDisputes(nextDisputes);
        setLoading(false);
      }
    };

    void run();

    return () => {
      active = false;
    };
  }, [user?.id]);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <section className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-sm p-8 shadow-xl relative overflow-hidden">
        {/* Decorative Orb */}
        <div className="absolute -right-20 -top-20 w-64 h-64 rounded-full bg-blue-600 blur-[100px] opacity-10" />

        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-400 relative z-10">
          Resolution Desk
        </p>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-white leading-tight relative z-10">
          Review and respond to dispute cases from the landlord dashboard
        </h1>
        <p className="mt-4 max-w-2xl text-sm font-medium text-blue-200/60 leading-relaxed relative z-10">
          This surface closes the frontend gap around dispute tracking by giving
          landlords a single place to watch case status, evidence volume, and
          outstanding response load.
        </p>

        <div className="mt-8 grid gap-5 md:grid-cols-3 relative z-10">
          <Stat
            icon={<AlertTriangle className="h-5 w-5 text-amber-400" />}
            label="Open"
            value={`${disputes.filter((item) => item.status === 'OPEN').length}`}
          />
          <Stat
            icon={<Gavel className="h-5 w-5 text-blue-400" />}
            label="Under review"
            value={`${disputes.filter((item) => item.status === 'UNDER_REVIEW').length}`}
          />
          <Stat
            icon={<FileStack className="h-5 w-5 text-emerald-400" />}
            label="Resolved"
            value={`${disputes.filter((item) => item.status === 'RESOLVED').length}`}
          />
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 backdrop-blur-sm shadow-xl mt-8">
        <div className="border-b border-white/5 px-8 py-6">
          <h2 className="text-xl font-bold text-white tracking-tight">
            Active cases
          </h2>
          <p className="text-xs text-blue-200/40 font-medium mt-1">
            Each record includes dispute type, comment volume, evidence volume,
            and resolution notes where available.
          </p>
        </div>

        {loading ? (
          <div className="flex min-h-80 items-center justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/5 border-t-blue-500" />
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {disputes.map((dispute) => (
              <article
                key={dispute.id}
                className="px-8 py-6 hover:bg-white/5 transition-all group"
              >
                <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-300/40">
                        {dispute.disputeId}
                      </p>
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest border transition-all ${statusStyles[dispute.status]}`}
                      >
                        {dispute.status.replace('_', ' ')}
                      </span>
                    </div>
                    <h3 className="mt-4 text-xl font-bold text-white group-hover:text-blue-400 transition-colors">
                      {dispute.propertyName}
                    </h3>
                    <p className="mt-1 text-sm text-blue-200/60 font-medium">
                      {dispute.agreementReference} • Raised by{' '}
                      {dispute.counterpartyName}
                    </p>
                    <p className="mt-4 max-w-2xl text-sm leading-relaxed text-blue-200/40 font-medium">
                      {dispute.description}
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3 xl:min-w-96">
                    <MiniCard
                      label="Type"
                      value={dispute.disputeType.replace('_', ' ')}
                    />
                    <MiniCard
                      label="Evidence"
                      value={`${dispute.evidenceCount}`}
                    />
                    <MiniCard
                      label="Comments"
                      value={`${dispute.commentCount}`}
                      icon={<MessageSquareText className="h-4 w-4" />}
                    />
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap gap-4 text-[10px] font-bold uppercase tracking-widest text-blue-300/40">
                  <span>
                    Created {format(new Date(dispute.createdAt), 'MMM d, yyyy')}
                  </span>
                  <span>
                    Updated {format(new Date(dispute.updatedAt), 'MMM d, yyyy')}
                  </span>
                  {typeof dispute.requestedAmount === 'number' ? (
                    <span className="text-white">
                      Requested {formatCurrency(dispute.requestedAmount)}
                    </span>
                  ) : null}
                </div>

                {dispute.resolution ? (
                  <div className="mt-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 px-5 py-4 text-xs font-medium text-emerald-400 leading-relaxed shadow-lg">
                    <span className="font-bold text-white uppercase tracking-widest mr-2 opacity-50">
                      Resolution:
                    </span>{' '}
                    {dispute.resolution}
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl group hover:border-white/20 transition-all">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 border border-blue-500/20 shadow-inner group-hover:bg-blue-500/20 transition-all">
        {icon}
      </div>
      <p className="mt-5 text-[10px] font-bold uppercase tracking-widest text-blue-300/40">
        {label}
      </p>
      <p className="mt-1 text-3xl font-bold tracking-tight text-white">
        {value}
      </p>
    </div>
  );
}

function MiniCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/5 bg-white/5 px-5 py-4 hover:border-white/10 transition-all">
      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-blue-300/40">
        {icon}
        {label}
      </div>
      <p className="mt-2 text-sm font-bold text-white leading-tight">{value}</p>
    </div>
  );
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(amount);
}
