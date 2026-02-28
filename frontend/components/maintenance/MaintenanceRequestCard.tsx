'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Calendar, CircleAlert, UserRound, Wrench } from 'lucide-react';
import {
  PRIORITY_LABELS,
  PRIORITY_STYLES,
  STATUS_LABELS,
  STATUS_OPTIONS,
  STATUS_STYLES,
} from './config';
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
    <article className="bg-white border border-gray-200 rounded-xl p-4 md:p-5 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex border px-2.5 py-1 rounded-full text-xs font-semibold ${PRIORITY_STYLES[request.priority]}`}
        >
          {PRIORITY_LABELS[request.priority]}
        </span>
        <span
          className={`inline-flex border px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_STYLES[status]}`}
        >
          {STATUS_LABELS[status]}
        </span>
        <span className="text-xs text-gray-500">
          {new Date(request.createdAt).toLocaleString()}
        </span>
      </div>

      <div>
        <h3 className="text-base font-semibold text-neutral-900">
          {request.propertyName}
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          <span className="font-medium">{request.category}: </span>
          {request.description}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-gray-700">
        <div className="flex items-center gap-2">
          <UserRound size={16} className="text-gray-500" />
          <span>{request.tenantName ?? 'Tenant'}</span>
        </div>
        <div className="flex items-center gap-2">
          <Wrench size={16} className="text-gray-500" />
          <span>{request.contractorName || 'Contractor unassigned'}</span>
        </div>
        <div className="flex items-center gap-2">
          <Calendar size={16} className="text-gray-500" />
          <span>
            {request.scheduledVisit
              ? new Date(request.scheduledVisit).toLocaleString()
              : 'Visit not scheduled'}
          </span>
        </div>
      </div>

      {request.media.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-neutral-800">Media</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {request.media.map((item) => (
              <div
                key={item.id}
                className="overflow-hidden rounded-lg border border-gray-200 bg-gray-50"
              >
                {item.type.startsWith('video') ? (
                  <video
                    controls
                    src={item.url}
                    className="w-full h-44 object-cover"
                  />
                ) : (
                  <Image
                    src={item.url}
                    alt={item.name}
                    width={480}
                    height={176}
                    unoptimized
                    className="w-full h-44 object-cover"
                  />
                )}
                <p className="text-xs text-gray-600 px-3 py-2 truncate">
                  {item.name}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {showManagementControls && (
        <div className="border-t border-gray-200 pt-3 space-y-3">
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <CircleAlert size={16} className="text-gray-500" />
            <span>Manage request status, assignment and schedule</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <select
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as RequestStatus)
              }
              className="border border-gray-300 rounded-lg px-3 py-2.5 bg-white text-sm"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {STATUS_LABELS[option]}
                </option>
              ))}
            </select>

            <input
              value={contractorName}
              onChange={(event) => setContractorName(event.target.value)}
              placeholder="Assign contractor"
              className="border border-gray-300 rounded-lg px-3 py-2.5 bg-white text-sm"
            />

            <input
              type="datetime-local"
              value={scheduledVisit}
              onChange={(event) => setScheduledVisit(event.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2.5 bg-white text-sm"
            />
          </div>

          <button
            onClick={saveUpdates}
            disabled={saving}
            className="bg-[#1e40af] text-white text-sm font-semibold rounded-lg px-4 py-2 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Update Request'}
          </button>
        </div>
      )}
    </article>
  );
}
