'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Calendar, CircleAlert, UserRound, Wrench } from 'lucide-react';
import { PRIORITY_LABELS, STATUS_LABELS, STATUS_OPTIONS } from './config';
import { MaintenanceRequest, RequestStatus } from './types';

interface MaintenanceRequestCardProps {
  request: MaintenanceRequest;
  showManagementControls: boolean;
  onUpdateRequest: (
    id: string,
    patch: Partial<MaintenanceRequest>,
  ) => Promise<void>;
}

export default function MaintenanceRequestCard({
  request,
  showManagementControls,
  onUpdateRequest,
}: MaintenanceRequestCardProps) {
  const [status, setStatus] = useState<RequestStatus>(request.status);
  const [contractorName, setContractorName] = useState(
    request.contractorName ?? '',
  );
  const [scheduledVisit, setScheduledVisit] = useState(
    request.scheduledVisit ? request.scheduledVisit.slice(0, 16) : '',
  );
  const [saving, setSaving] = useState(false);

  const saveUpdates = async () => {
    setSaving(true);
    try {
      await onUpdateRequest(request.id, {
        status,
        contractorName: contractorName.trim() || undefined,
        scheduledVisit: scheduledVisit
          ? new Date(scheduledVisit).toISOString()
          : undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <article className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-[2rem] p-6 shadow-xl hover:bg-white/10 transition-all duration-300 group relative overflow-hidden">
      <div className="absolute -right-12 -top-12 w-48 h-48 rounded-full bg-blue-600 blur-[80px] opacity-0 group-hover:opacity-10 transition-opacity duration-700" />

      <div className="flex flex-wrap items-center gap-3 relative z-10">
        <span
          className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${
            request.priority === 'emergency'
              ? 'bg-red-500/10 border-red-500/20 text-red-400'
              : request.priority === 'urgent'
                ? 'bg-orange-500/10 border-orange-500/20 text-orange-400'
                : 'bg-blue-500/10 border-blue-500/20 text-blue-400'
          }`}
        >
          {PRIORITY_LABELS[request.priority]}
        </span>
        <span
          className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${
            status === 'open'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              : status === 'in_progress'
                ? 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                : 'bg-slate-500/10 border-white/10 text-white/40'
          }`}
        >
          {STATUS_LABELS[status]}
        </span>
        <span className="text-[10px] font-bold text-blue-200/20 ml-auto uppercase tracking-widest">
          {new Date(request.createdAt).toLocaleDateString()}
        </span>
      </div>

      <div className="mt-4 relative z-10">
        <h3 className="text-lg font-black text-white group-hover:text-blue-400 transition-colors">
          {request.propertyName}
        </h3>
        <p className="text-sm font-medium text-blue-200/40 mt-1 leading-relaxed">
          <span className="text-white/60">{request.category}:</span>{' '}
          {request.description}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
            <UserRound size={14} className="text-blue-400" />
          </div>
          <span className="text-xs font-bold text-white/60 tracking-tight">
            {request.tenantName ?? 'Tenant'}
          </span>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
            <Wrench size={14} className="text-amber-400" />
          </div>
          <span className="text-xs font-bold text-white/60 tracking-tight">
            {request.contractorName || 'Unassigned'}
          </span>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
            <Calendar size={14} className="text-indigo-400" />
          </div>
          <span className="text-xs font-bold text-white/60 tracking-tight">
            {request.scheduledVisit
              ? new Date(request.scheduledVisit).toLocaleDateString()
              : 'Not scheduled'}
          </span>
        </div>
      </div>

      {request.media.length > 0 && (
        <div className="space-y-3 pt-2 relative z-10">
          <p className="text-[10px] font-black uppercase tracking-widest text-blue-200/20">
            Attachments
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {request.media.map((item) => (
              <div
                key={item.id}
                className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 group/media"
              >
                {item.type.startsWith('video') ? (
                  <video
                    controls
                    src={item.url}
                    className="w-full h-32 object-cover grayscale group-hover/media:grayscale-0 transition-all duration-500"
                  />
                ) : (
                  <Image
                    src={item.url}
                    alt={item.name}
                    width={480}
                    height={128}
                    unoptimized
                    className="w-full h-32 object-cover grayscale group-hover/media:grayscale-0 transition-all duration-500"
                  />
                )}
                <p className="text-[10px] font-bold text-blue-200/40 px-3 py-2 uppercase tracking-widest truncate">
                  {item.name}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {showManagementControls && (
        <div className="border-t border-white/5 pt-6 mt-6 space-y-5 relative z-10">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center">
              <CircleAlert size={14} className="text-blue-400" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-blue-200/40">
              Manage request status and assign
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <select
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as RequestStatus)
              }
              className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500/40 transition-colors"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option} value={option} className="bg-slate-900">
                  {STATUS_LABELS[option]}
                </option>
              ))}
            </select>

            <input
              value={contractorName}
              onChange={(event) => setContractorName(event.target.value)}
              placeholder="Assign contractor"
              className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white placeholder:text-blue-200/20 focus:outline-none focus:border-blue-500/40 transition-colors"
            />

            <input
              type="datetime-local"
              value={scheduledVisit}
              onChange={(event) => setScheduledVisit(event.target.value)}
              className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500/40 transition-colors"
              style={{ colorScheme: 'dark' }}
            />
          </div>

          <button
            onClick={saveUpdates}
            disabled={saving}
            className="w-full py-3.5 bg-blue-600 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl shadow-[0_0_20px_rgba(37,99,235,0.2)] hover:bg-blue-500 hover:shadow-[0_0_30px_rgba(37,99,235,0.4)] disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-300"
          >
            {saving ? 'Updating...' : 'Save Management Data'}
          </button>
        </div>
      )}
    </article>
  );
}
