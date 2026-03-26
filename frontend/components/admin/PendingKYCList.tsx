'use client';

import React, { useMemo, useState } from 'react';
import { Check, Eye, FileText, Search, X } from 'lucide-react';
import toast from 'react-hot-toast';
import type { KycVerification, PaginatedResponse } from '@/types';

interface PendingKYCListProps {
  data?: PaginatedResponse<KycVerification>;
  isLoading: boolean;
  page: number;
  setPage: (page: number) => void;
  onApprove: (verificationId: string) => Promise<void>;
  onReject: (verificationId: string, reason?: string) => Promise<void>;
}

export function PendingKYCList({
  data,
  isLoading,
  page,
  setPage,
  onApprove,
  onReject,
}: PendingKYCListProps) {
  const [selectedDocUrl, setSelectedDocUrl] = useState<string | null>(null);
  const [selectedDocName, setSelectedDocName] = useState<string>('Document Preview');
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('');

  const totalPages = data?.totalPages ?? 1;
  const rows = useMemo(() => data?.data ?? [], [data]);

  if (isLoading) {
    return (
      <div className="bg-white/5 backdrop-blur-sm rounded-3xl border border-white/10 p-10 text-center text-blue-200/70">
        Loading pending verifications...
      </div>
    );
  }

  if (!rows.length) {
    return (
      <div className="bg-white/5 backdrop-blur-sm rounded-3xl border border-white/10 p-10 text-center">
        <Search className="mx-auto mb-3 text-blue-300/40" size={24} />
        <p className="text-white font-semibold">No pending KYC verifications</p>
        <p className="text-blue-200/60 text-sm mt-1">
          You are all caught up for now.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white/5 backdrop-blur-sm rounded-3xl border border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px]">
            <thead className="bg-white/[0.03] border-b border-white/10">
              <tr className="text-left text-xs uppercase tracking-wider text-blue-200/70">
                <th className="px-5 py-4">User</th>
                <th className="px-5 py-4">KYC Details</th>
                <th className="px-5 py-4">Documents</th>
                <th className="px-5 py-4">Submitted</th>
                <th className="px-5 py-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((item) => {
                const docs = item.documents ?? [];
                const fullName = `${item.kycData?.first_name ?? ''} ${item.kycData?.last_name ?? ''}`.trim();
                return (
                  <tr key={item.id} className="border-b border-white/5 last:border-b-0">
                    <td className="px-5 py-4 align-top">
                      <p className="font-semibold text-white">
                        {item.user?.name || fullName || 'Unknown User'}
                      </p>
                      <p className="text-xs text-blue-200/70">{item.user?.email || 'No email'}</p>
                      <p className="text-xs text-blue-300/50 mt-1">ID: {item.userId}</p>
                    </td>
                    <td className="px-5 py-4 align-top">
                      <div className="space-y-1 text-sm text-blue-100/90">
                        <p>Country: {String(item.kycData?.country ?? 'N/A')}</p>
                        <p>DOB: {String(item.kycData?.dob ?? 'N/A')}</p>
                        <p className="text-xs text-blue-300/60">
                          Status: {item.status}
                        </p>
                      </div>
                    </td>
                    <td className="px-5 py-4 align-top">
                      <div className="space-y-2">
                        {docs.length === 0 ? (
                          <p className="text-xs text-amber-300/80">No documents attached</p>
                        ) : (
                          docs.map((doc) => (
                            <button
                              key={doc.id}
                              type="button"
                              onClick={() => {
                                setSelectedDocUrl(doc.url);
                                setSelectedDocName(doc.filename || doc.type || 'Document Preview');
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
                    <td className="px-5 py-4 align-top text-sm text-blue-100/80">
                      {new Date(item.createdAt).toLocaleString()}
                    </td>
                    <td className="px-5 py-4 align-top">
                      <div className="flex flex-col gap-2 max-w-[220px]">
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              await onApprove(item.id);
                              toast.success('KYC verification approved');
                            } catch {
                              toast.error('Failed to approve KYC verification');
                            }
                          }}
                          className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/30 text-emerald-200 text-xs font-bold transition-all"
                        >
                          <Check size={14} />
                          Approve
                        </button>
                        {rejectingId === item.id ? (
                          <div className="space-y-2">
                            <textarea
                              value={rejectReason}
                              onChange={(e) => setRejectReason(e.target.value)}
                              placeholder="Optional rejection reason..."
                              className="w-full h-16 rounded-lg bg-white/5 border border-white/10 text-white text-xs p-2 outline-none focus:border-rose-400/50"
                            />
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setRejectingId(null);
                                  setRejectReason('');
                                }}
                                className="flex-1 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-white"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={async () => {
                                  try {
                                    await onReject(item.id, rejectReason || undefined);
                                    toast.success('KYC verification rejected');
                                    setRejectingId(null);
                                    setRejectReason('');
                                  } catch {
                                    toast.error('Failed to reject KYC verification');
                                  }
                                }}
                                className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400/30 text-rose-200 text-xs font-bold"
                              >
                                <X size={13} />
                                Reject
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setRejectingId(item.id);
                              setRejectReason('');
                            }}
                            className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400/30 text-rose-200 text-xs font-bold transition-all"
                          >
                            <X size={14} />
                            Reject
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-blue-200/70">
          Showing page {page} of {totalPages} ({data?.total ?? rows.length} total)
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      </div>

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
