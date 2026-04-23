import Link from 'next/link';
import {
  ArrowLeft,
  Calendar,
  FileText,
  ShieldCheck,
  Wallet,
} from 'lucide-react';

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

interface EscrowPreview {
  hash: string;
  property: string;
  amount: number;
  status: string;
  date: string;
  type: string;
  image: string;
}

const ESCROW_PREVIEWS: EscrowPreview[] = [
  {
    hash: 'GLMN5R7T\u20268C4D',
    property: 'Glover Road, Ikoyi',
    amount: 500000,
    status: 'Processed',
    date: 'Jun 05, 2025',
    type: 'Deposit Refund',
    image:
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80',
  },
  {
    hash: 'GABD6E9F\u20264M5N',
    property: '101 Adeola Odeku St',
    amount: 2500000,
    status: 'Held',
    date: 'Apr 28, 2025',
    type: 'Security Deposit',
    image:
      'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1200&q=80',
  },
];

const fallbackImage =
  'https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80';

function normalizeHash(value: string): string {
  return value.replace(/[^a-z0-9]/gi, '').toUpperCase();
}

function findPreview(id: string): EscrowPreview {
  const decodedId = decodeURIComponent(id);
  return (
    ESCROW_PREVIEWS.find(
      (preview) => normalizeHash(preview.hash) === normalizeHash(decodedId),
    ) ?? {
      hash: decodedId,
      property: 'Security deposit escrow',
      amount: 0,
      status: 'Pending',
      date: 'Pending confirmation',
      type: 'Escrow Preview',
      image: fallbackImage,
    }
  );
}

export default async function EscrowDetailPage({ params }: PageProps) {
  const { id } = await params;
  const escrow = findPreview(id);

  return (
    <div className="space-y-6">
      <Link
        href="/user/financials"
        className="inline-flex items-center gap-2 text-sm font-bold text-blue-300 hover:text-white transition-colors"
      >
        <ArrowLeft size={16} />
        Back to financials
      </Link>

      <section className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-xl">
        <div className="relative min-h-[320px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={escrow.image}
            alt={`${escrow.property} escrow preview`}
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-slate-950/65" />
          <div className="relative z-10 flex min-h-[320px] flex-col justify-end p-6 sm:p-8">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-400/30 bg-emerald-500/15 text-emerald-300">
              <ShieldCheck size={28} />
            </div>
            <p className="text-xs font-bold uppercase tracking-widest text-blue-200/60">
              {escrow.type}
            </p>
            <h1 className="mt-2 max-w-3xl text-3xl font-bold tracking-tight text-white sm:text-4xl">
              {escrow.property}
            </h1>
          </div>
        </div>

        <div className="grid gap-4 p-6 sm:grid-cols-3 sm:p-8">
          <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
            <div className="mb-3 flex items-center gap-2 text-blue-200/60">
              <Wallet size={16} />
              <span className="text-[10px] font-bold uppercase tracking-widest">
                Amount
              </span>
            </div>
            <p className="text-xl font-bold text-white">
              {escrow.amount > 0
                ? `$${escrow.amount.toLocaleString()} USDC`
                : 'Awaiting amount'}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
            <div className="mb-3 flex items-center gap-2 text-blue-200/60">
              <FileText size={16} />
              <span className="text-[10px] font-bold uppercase tracking-widest">
                Status
              </span>
            </div>
            <p className="text-xl font-bold text-white">{escrow.status}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
            <div className="mb-3 flex items-center gap-2 text-blue-200/60">
              <Calendar size={16} />
              <span className="text-[10px] font-bold uppercase tracking-widest">
                Date
              </span>
            </div>
            <p className="text-xl font-bold text-white">{escrow.date}</p>
          </div>
        </div>

        <div className="border-t border-white/10 px-6 py-5 sm:px-8">
          <p className="break-all font-mono text-xs text-blue-200/50">
            Stellar transaction: {escrow.hash}
          </p>
        </div>
      </section>
    </div>
  );
}
