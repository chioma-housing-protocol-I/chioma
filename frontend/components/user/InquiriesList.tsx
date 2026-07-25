'use client';

import React from 'react';
import {
  Search,
  Filter,
  Loader2,
  Mail,
  Phone,
  Home,
  MessageCircleQuestion,
  CheckCircle2,
  Circle,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import {
  useIncomingInquiries,
  useOutgoingInquiries,
  useMarkInquiryViewed,
} from '@/lib/query/hooks/use-inquiries';
import type { InquiryRecord, PropertyInquiryStatus } from '@/lib/inquiries/api';

const statusBadge: Record<PropertyInquiryStatus, string> = {
  pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  viewed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
};

function matchesSearch(inquiry: InquiryRecord, search: string) {
  const normalized = search.trim().toLowerCase();
  if (!normalized) return true;

  return [
    inquiry.property?.title,
    inquiry.property?.address,
    inquiry.counterparty?.name,
    inquiry.message,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .includes(normalized);
}

interface InquiryCardProps {
  inquiry: InquiryRecord;
  direction: 'incoming' | 'outgoing';
  onOpen: (id: string) => void;
}

function InquiryCard({ inquiry, direction, onOpen }: InquiryCardProps) {
  const [expanded, setExpanded] = React.useState(false);
  const isUnread = direction === 'incoming' && inquiry.status === 'pending';

  const handleToggle = () => {
    const next = !expanded;
    setExpanded(next);
    if (next && isUnread) {
      onOpen(inquiry.id);
    }
  };

  return (
    <div
      className={`rounded-2xl border p-4 transition-colors ${
        isUnread
          ? 'border-blue-500/30 bg-blue-500/5'
          : 'border-white/10 bg-white/5'
      }`}
    >
      <button
        type="button"
        onClick={handleToggle}
        className="flex w-full items-start gap-4 text-left"
      >
        <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-white/5">
          {inquiry.property?.coverImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={inquiry.property.coverImageUrl}
              alt={inquiry.property.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-blue-300/40">
              <Home className="h-5 w-5" />
            </span>
          )}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="truncate font-bold text-white">
              {inquiry.property?.title ?? 'Property no longer listed'}
            </h3>
            <span
              className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${statusBadge[inquiry.status]}`}
            >
              {isUnread ? (
                <Circle className="h-2.5 w-2.5 fill-current" />
              ) : (
                <CheckCircle2 className="h-3 w-3" />
              )}
              {inquiry.status}
            </span>
          </div>

          <p className="mt-0.5 text-xs text-blue-300/40">
            {direction === 'incoming' ? 'From ' : 'To '}
            <span className="font-semibold text-blue-200/70">
              {inquiry.counterparty?.name ?? 'Unknown user'}
            </span>{' '}
            &middot;{' '}
            {formatDistanceToNow(new Date(inquiry.createdAt), {
              addSuffix: true,
            })}
          </p>

          <p
            className={`mt-2 text-sm text-blue-200/60 ${expanded ? '' : 'truncate'}`}
          >
            {inquiry.message}
          </p>
        </div>
      </button>

      {expanded && (
        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-white/10 pt-4">
          {inquiry.counterparty?.email && (
            <a
              href={`mailto:${inquiry.counterparty.email}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-blue-300/70 transition-colors hover:bg-white/10 hover:text-white"
            >
              <Mail className="h-3.5 w-3.5" />
              {inquiry.counterparty.email}
            </a>
          )}
          {inquiry.counterparty?.phone && (
            <a
              href={`tel:${inquiry.counterparty.phone}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-blue-300/70 transition-colors hover:bg-white/10 hover:text-white"
            >
              <Phone className="h-3.5 w-3.5" />
              {inquiry.counterparty.phone}
            </a>
          )}
          {inquiry.property?.address && (
            <span className="inline-flex items-center gap-1.5 text-xs text-blue-300/40">
              <Home className="h-3.5 w-3.5" />
              {[inquiry.property.address, inquiry.property.city]
                .filter(Boolean)
                .join(', ')}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

interface InquiriesListProps {
  direction: 'incoming' | 'outgoing';
  className?: string;
}

export function InquiriesList({
  direction,
  className = '',
}: InquiriesListProps) {
  const [search, setSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<
    PropertyInquiryStatus | 'ALL'
  >('ALL');

  const incoming = useIncomingInquiries();
  const outgoing = useOutgoingInquiries();
  const { data, isLoading, error } =
    direction === 'incoming' ? incoming : outgoing;

  const markViewed = useMarkInquiryViewed();

  const inquiries = React.useMemo(() => {
    return (data ?? []).filter(
      (inquiry) =>
        (statusFilter === 'ALL' || inquiry.status === statusFilter) &&
        matchesSearch(inquiry, search),
    );
  }, [data, search, statusFilter]);

  if (error) {
    return (
      <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-10 text-center">
        <h3 className="mb-1 text-base font-semibold text-white">
          Failed to load inquiries
        </h3>
        <p className="mb-4 text-sm text-blue-200/50">
          There was an issue fetching your inquiries.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/20"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex flex-col items-stretch justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm sm:flex-row sm:items-center">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-blue-300/40" />
            <input
              placeholder={
                direction === 'incoming'
                  ? 'Search by property or sender...'
                  : 'Search by property or landlord...'
              }
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-9 pr-4 text-sm text-white placeholder:text-blue-300/30 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as PropertyInquiryStatus | 'ALL')
            }
            className="cursor-pointer appearance-none rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          >
            <option value="ALL" className="bg-slate-900">
              All Statuses
            </option>
            <option value="pending" className="bg-slate-900">
              Pending
            </option>
            <option value="viewed" className="bg-slate-900">
              Viewed
            </option>
          </select>
        </div>
        <div className="flex items-center gap-2 text-sm text-blue-200/40">
          <Filter className="h-4 w-4" />
          <span>
            {inquiries.length} inquir{inquiries.length !== 1 ? 'ies' : 'y'}
          </span>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-12">
          <Loader2 className="h-6 w-6 animate-spin text-blue-400" />
          <span className="text-blue-200/50">Loading inquiries...</span>
        </div>
      ) : inquiries.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-16 text-center">
          <MessageCircleQuestion className="mx-auto mb-4 h-12 w-12 text-blue-300/20" />
          <h3 className="mb-1 text-lg font-bold text-white">
            No inquiries yet
          </h3>
          <p className="text-sm text-blue-200/40">
            {direction === 'incoming'
              ? 'Questions from prospective tenants about your listings will show up here.'
              : "Inquiries you've sent to landlords will show up here."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {inquiries.map((inquiry) => (
            <InquiryCard
              key={inquiry.id}
              inquiry={inquiry}
              direction={direction}
              onOpen={(id) => markViewed.mutate(id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
