'use client';

import React from 'react';
import { format } from 'date-fns';
import { Eye, ChevronLeft, ChevronRight, User as UserIcon } from 'lucide-react';
import type { AuditLog, PaginatedResponse } from '@/types';

interface ListProps {
  logs: PaginatedResponse<AuditLog> | undefined;
  isLoading: boolean;
  onViewDetails: (log: AuditLog) => void;
  page: number;
  setPage: (page: number) => void;
}

export const AuditLogList: React.FC<ListProps> = ({
  logs,
  isLoading,
  onViewDetails,
  page,
  setPage,
}) => {
  if (isLoading) {
    return (
      <div className="h-64 flex items-center justify-center bg-white/5 rounded-3xl border border-white/10">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const data = logs?.data || [];
  const totalPages = logs?.totalPages || 1;

  const getActionBadge = (action: string) => {
    const colors: Record<string, string> = {
      CREATE: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      UPDATE: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      DELETE: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
      LOGIN: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
      FAILURE: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    };
    return colors[action] || 'bg-white/5 text-blue-300/40 border-white/10';
  };

  return (
    <div className="space-y-4">
      <div className="bg-white/5 backdrop-blur-sm rounded-3xl border border-white/10 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-white/5 text-blue-300/40">
              <tr>
                <th className="px-6 py-4 font-bold uppercase tracking-widest text-[10px]">
                  Action
                </th>
                <th className="px-6 py-4 font-bold uppercase tracking-widest text-[10px]">
                  Entity
                </th>
                <th className="px-6 py-4 font-bold uppercase tracking-widest text-[10px]">
                  Performed By
                </th>
                <th className="px-6 py-4 font-bold uppercase tracking-widest text-[10px]">
                  Date & Time
                </th>
                <th className="px-6 py-4 font-bold uppercase tracking-widest text-[10px] text-right">
                  Details
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {data.map((log) => (
                <tr
                  key={log.id}
                  className="hover:bg-white/5 transition-colors group"
                >
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getActionBadge(log.action)}`}
                    >
                      {log.action}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-white font-medium">
                        {log.entity}
                      </span>
                      <span className="text-[10px] text-blue-300/40 font-mono truncate max-w-[120px]">
                        {log.entityId}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 bg-white/5 rounded-full flex items-center justify-center border border-white/5">
                        <UserIcon size={14} className="text-blue-300/60" />
                      </div>
                      <span className="text-blue-200/60 font-medium truncate max-w-[150px]">
                        {log.user?.email || log.userId || 'System'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-blue-200/60">
                    {format(new Date(log.createdAt), 'MMM d, yyyy • HH:mm:ss')}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => onViewDetails(log)}
                      className="p-2 text-blue-400 hover:text-white hover:bg-white/5 rounded-xl transition-all"
                    >
                      <Eye size={18} />
                    </button>
                  </td>
                </tr>
              ))}
              {data.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-12 text-center text-blue-200/40"
                  >
                    No audit logs found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-2">
        <p className="text-xs text-blue-300/40">
          Page <span className="text-white font-bold">{page}</span> of{' '}
          <span className="text-white font-bold">{totalPages}</span>
        </p>
        <div className="flex items-center gap-2">
          <button
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
            className="p-2 text-blue-400 hover:text-white hover:bg-white/5 border border-white/10 rounded-xl disabled:opacity-30 disabled:pointer-events-none transition-all"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
            className="p-2 text-blue-400 hover:text-white hover:bg-white/5 border border-white/10 rounded-xl disabled:opacity-30 disabled:pointer-events-none transition-all"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};
