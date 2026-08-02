import React from 'react';
import { Eye, User, ShieldAlert } from 'lucide-react';

interface AuditLog {
  id: number | string;
  timestamp: string;
  user: string;
  action: string;
  resource?: string;
  ip?: string;
  details?: string;
}

interface AuditLogListProps {
  logs: AuditLog[];
  onViewDetails: (log: AuditLog) => void;
}

export const AuditLogList = ({ logs, onViewDetails }: AuditLogListProps) => {
  return (
    <div className="w-full overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-[10px] uppercase font-bold tracking-widest">
              <th className="px-6 py-5">Event Time</th>
              <th className="px-6 py-5">Initiator</th>
              <th className="px-6 py-5">Operation</th>
              <th className="px-6 py-5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {logs?.map((log) => (
              <tr
                key={log.id}
                className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group"
              >
                <td className="px-6 py-4 text-xs text-slate-500 font-mono whitespace-nowrap">
                  {log.timestamp}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-full flex items-center justify-center border border-slate-200 dark:border-slate-700">
                      <User size={14} />
                    </div>
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                      {log.user}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold uppercase tracking-tight border border-indigo-100 dark:border-indigo-800">
                    {log.action}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => onViewDetails(log)}
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-200 dark:hover:border-indigo-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold transition-all shadow-sm active:scale-95"
                  >
                    <Eye size={14} />
                    <span>View</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(!logs || logs.length === 0) && (
        <div className="p-12 text-center">
          <div className="inline-flex p-4 bg-slate-50 dark:bg-slate-800 rounded-full mb-4">
            <ShieldAlert className="text-slate-300" size={32} />
          </div>
          <p className="text-slate-500 font-medium">
            No activity logs found for this period.
          </p>
        </div>
      )}
    </div>
  );
};
