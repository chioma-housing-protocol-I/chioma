'use client';

import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  Eye,
  FileText,
  RefreshCw,
  Search,
  X,
} from 'lucide-react';
import type { KycVerification, PaginatedResponse } from '@/types';

interface RejectedKYCListProps {
  data?: PaginatedResponse<KycVerification>;
  isLoading: boolean;
  page: number;
  setPage: (page: number) => void;
}

// Common rejection reason groups for colour-coding the badges
const REASON_COLORS: { pattern: RegExp; className: string }[] = [
  {
    pattern: /blurry|unclear|quality|resolution/i,
    className: 'bg-amber-500/15 border-amber-400/30 text-amber-300',
  },
  {
    pattern: /expired|expiry|validity/i,
    className: 'bg-orange-500/15 border-orange-400/30 text-orange-300',
  },
  {
    pattern: /mismatch|different|match/i,
    className: 'bg-rose-500/15 border-rose-400/30 text-rose-300',
  },
  {
    pattern: /missing|incomplete|required/i,
    className: 'bg-purple-500/15 border-purple-400/30 text-purple-300',
  },
  {
    pattern: /resubmit|updated|new/i,
    className: 'bg-blue-500/15 border-blue-400/30 text-blue-300',
  },
];

function reasonBadgeClass(reason?: string): string {
  if (!reason) return 'bg-white/5 border-white/10 text-blue-200/70';
  const match = REASON_COLORS.find((r) => r.pattern.test(reason));
  return match
    ? match.className
    : 'bg-rose-500/15 border-rose-400/30 text-rose-300';
}

/** Heuristic: if updatedAt is meaningfully newer than createdAt, treat it as resubmitted. */
function isResubmitted(item: KycVerification): boolean {
  const created = new Date(item.createdAt).getTime();
  const updated = new Date(item.updatedAt).getTime();
  return updated - created > 60_000; // more than 1 min apart
}

export function RejectedKYCList({
  data,
  isLoading,
  page,
  setPage,
}: RejectedKYCListProps) {
  const [selectedDocUrl, setSelectedDocUrl] = useState<string | null>(null);
  const [selectedDocName, setSelectedDocName] = useState<string>('Document Preview');

  const totalPages = data?.totalPages ?? 1;
  const rows = useMemo(() => data?.data ?? [], [data]);

  /* ── Loading state ─────────────────────────────────────────────────────── */
  if (isLoading) {
    return (
      <div className="bg-white/5 backdrop-blur-sm rounded-3xl border border-white/10 p-10 text-center text-blue-200/70">
        Loading rejected verifications…
      </div>
    );
  }

  /* ── Empty state ───────────────────────────────────────────────────────── */
  if (!rows.length) {
    return (
      <div className="bg-white/5 backdrop-blur-sm rounded-3xl border border-white/10 p-10 text-center space-y-3">
        <Search className="mx-auto text-blue-300/40" size={28} />
        <p className="text-white font-semibold">No rejected KYC verifications</p>
        <p className="text-blue-200/60 text-sm">
          All clear — no rejections match the current filters.
        </p>
      </div>
    );
  }

  /* ── Main table ────────────────────────────────────────────────────────── */
  return (
    <div className="space-y-6">
      {/* Table */}
      <div className="bg-white/5 backdrop-blur-sm rounded-3xl border border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px]">
            <thead className="bg-white/[0.03] border-b border-white/10">
              <tr className="text-left text-xs uppercase tracking-wider text-blue-200/70">
                <th className="px-5 py-4">User</th>
                <th className="px-5 py-4">KYC Details</th>
                <th className="px-5 py-4">Rejection Reason</th>
                <th className="px-5 py-4">Documents</th>
                <th className="px-5 py-4">Resubmission</th>
                <th className="px-5 py-4">Rejected At</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((item) => {
                const docs = item.documents ?? [];
                const fullName = `${item.kycData?.first_name ?? ''} ${item.kycData?.last_name ?? ''}`.trim();
                const resubmitted = isResubmitted(item);

                return (
                  <tr
                    key={item.id}
                    className="border-b border-white/5 last:border-b-0 hover:bg-white/[0.025] transition-colors"
                  >
                    {/* User */}
                    <td className="px-5 py-4 align-top">
                      <p className="font-semibold text-white">
                        {item.user?.name || fullName || 'Unknown User'}
                      </p>
                      <p className="text-xs text-blue-200/70">
                        {item.user?.email || 'No email'}
                      </p>
                      <p className="text-xs text-blue-300/50 mt-1">ID: {item.userId}</p>
                    </td>

                    {/* KYC details */}
                    <td className="px-5 py-4 align-top">
                      <div className="space-y-1 text-sm text-blue-100/90">
                        <p>Country: {String(item.kycData?.country ?? 'N/A')}</p>
                        <p>DOB: {String(item.kycData?.dob ?? 'N/A')}</p>
                        <p className="text-xs text-rose-300/70 font-semibold">
                          Status: {item.status}
                        </p>
                      </div>
                    </td>

                    {/* Rejection reason */}
                    <td className="px-5 py-4 align-top max-w-[220px]">
                      {item.reason ? (
                        <div className="space-y-2">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium ${reasonBadgeClass(item.reason)}`}
                          >
                            <AlertCircle size={12} />
                            {item.reason}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-blue-200/40 italic">
                          No reason provided
                        </span>
                      )}
                    </td>

                    {/* Documents */}
                    <td className="px-5 py-4 align-top">
                      <div className="space-y-2">
                        {docs.length === 0 ? (
                          <p className="text-xs text-amber-300/80">No documents</p>
                        ) : (
                          docs.map((doc) => (
                            <button
                              key={doc.id}
                              type="button"
                              onClick={() => {
                                setSelectedDocUrl(doc.url);
                                setSelectedDocName(
                                  doc.filename || doc.type || 'Document Preview',
                                );
                              }}
                              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-white transition-all mr-2"
                            >
                              <FileText size={14} />
                              {doc.filename || doc.type || 'Document'}
                              <Eye size={14} className="text-blue-300" />
                            </button>
                          ))
                        )}
                      </div>
                    </td>

                    {/* Resubmission status */}
                    <td className="px-5 py-4 align-top">
                      {resubmitted ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-xs font-semibold">
                          <RefreshCw size={12} />
                          Resubmitted
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-blue-200/50 text-xs">
                          Awaiting resubmission
                        </span>
                      )}
                      {resubmitted && (
                        <p className="text-xs text-blue-300/50 mt-1.5">
                          {new Date(item.updatedAt).toLocaleString()}
                        </p>
                      )}
                    </td>

                    {/* Rejected at */}
                    <td className="px-5 py-4 align-top text-sm text-blue-100/80 whitespace-nowrap">
                      {new Date(item.createdAt).toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-blue-200/70">
          Showing page {page} of {totalPages} ({data?.total ?? rows.length} total)
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            Previous
          </button>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            Next
          </button>
        </div>
      </div>

      {/* Document preview modal */}
      {selectedDocUrl && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 p-4 flex items-center justify-center">
          <div className="w-full max-w-4xl max-h-[90vh] bg-slate-900 border border-white/10 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <p className="text-sm text-white font-semibold">{selectedDocName}</p>
              <button
                type="button"
                onClick={() => setSelectedDocUrl(null)}
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-4 max-h-[80vh] overflow-auto">
              {/\.(png|jpg|jpeg|gif|webp)$/i.test(selectedDocUrl) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={selectedDocUrl}
                  alt={selectedDocName}
                  className="w-full h-auto rounded-xl border border-white/10"
                />
              ) : (
                <iframe
                  title={selectedDocName}
                  src={selectedDocUrl}
                  className="w-full h-[70vh] rounded-xl border border-white/10"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
