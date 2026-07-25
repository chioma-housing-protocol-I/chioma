'use client';
import { Folder } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function TenantFilesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black text-white tracking-tight mb-1">
          Files & Media
        </h1>
        <p className="text-blue-200/50">
          Manage the media files and attachments associated with your leases.
        </p>
      </div>

      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-12 flex flex-col items-center text-center">
        <div className="w-16 h-16 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center justify-center mb-5">
          <Folder className="text-indigo-400" size={28} />
        </div>
        <h3 className="text-xl font-bold text-white mb-2">File Directory</h3>
        <p className="text-blue-200/40 max-w-sm">
          All uploaded media will appear organized here.
        </p>
      </div>
    </div>
  );
}
