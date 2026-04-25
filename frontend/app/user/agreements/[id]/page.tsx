import Link from 'next/link';
import { ArrowLeft, Calendar, FileText, Home } from 'lucide-react';

interface PageProps {
  params: Promise<{ id: string }>;
}

const AGREEMENT_PREVIEW_FALLBACK =
  'https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80';

const AGREEMENT_DETAILS: Record<
  string,
  { property: string; monthlyRent: string; dueDate: string; status: string; image: string }
> = {
  'AGR-4921': {
    property: 'Sunset Apartments, Unit 4B',
    monthlyRent: '$1,200',
    dueDate: 'Oct 1, 2023',
    status: 'Active',
    image:
      'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1200&q=80',
  },
  'AGR-4922': {
    property: 'Downtown Loft, Unit 12',
    monthlyRent: '$2,500',
    dueDate: 'Nov 1, 2023',
    status: 'Pending',
    image:
      'https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80',
  },
};

export default async function AgreementDetailsPage({ params }: PageProps) {
  const { id } = await params;
  const agreement = AGREEMENT_DETAILS[id] ?? {
    property: 'Agreement details',
    monthlyRent: 'Unavailable',
    dueDate: 'Unavailable',
    status: 'Unknown',
    image: AGREEMENT_PREVIEW_FALLBACK,
  };

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
            src={agreement.image}
            alt={`${agreement.property} agreement preview`}
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
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">{id}</h1>
            <p className="mt-1 text-sm text-blue-200/70">{agreement.property}</p>
          </div>
        </div>
        <div className="grid gap-4 p-6 sm:grid-cols-3 sm:p-8">
          <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
            <div className="mb-2 flex items-center gap-2 text-blue-200/60">
              <FileText size={16} />
              <span className="text-[10px] font-bold uppercase tracking-widest">Rent</span>
            </div>
            <p className="text-xl font-bold text-white">{agreement.monthlyRent}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
            <div className="mb-2 flex items-center gap-2 text-blue-200/60">
              <Calendar size={16} />
              <span className="text-[10px] font-bold uppercase tracking-widest">Next Due</span>
            </div>
            <p className="text-xl font-bold text-white">{agreement.dueDate}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
            <div className="mb-2 flex items-center gap-2 text-blue-200/60">
              <Home size={16} />
              <span className="text-[10px] font-bold uppercase tracking-widest">Status</span>
            </div>
            <p className="text-xl font-bold text-white">{agreement.status}</p>
          </div>
        </div>
      </section>
    </div>
  );
}
