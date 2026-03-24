'use client';

import React from 'react';
import { AuditLogList } from '@/components/AuditLogList';
import { Search, Download } from 'lucide-react';

export default function AuditLogsPage() {
  const mockLogs = [
    { id: 1, timestamp: '2026-03-24 14:30:01', user: 'admin@chioma.io', action: 'KYC_APPROVE' },
    { id: 2, timestamp: '2026-03-24 12:15:22', user: 'system_bot', action: 'TOKEN_MINT' },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto min-h-screen pt-24 bg-slate-50 dark:bg-slate-950">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black dark:text-white">Audit Log Viewer</h1>
          <p className="text-slate-500">Compliance monitoring and activity trails.</p>
        </div>
        <button className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20">
          <Download size={18} /> Export CSV
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="md:col-span-2 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search by user or action..." 
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
          />
        </div>
        <select className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-900 dark:text-white">
          <option>All Actions</option>
          <option>Create</option>
          <option>Update</option>
          <option>Delete</option>
        </select>
      </div>

      <AuditLogList logs={mockLogs} />
    </div>
  );
}
