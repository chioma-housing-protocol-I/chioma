'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Filter, List, LayoutGrid, BellRing } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  DEFAULT_PROPERTIES,
  ISSUE_CATEGORIES,
  PRIORITY_LEVELS,
  STATUS_LABELS,
  STATUS_OPTIONS,
} from './config';
import MaintenanceRequestCard from './MaintenanceRequestCard';
import MaintenanceRequestForm from './MaintenanceRequestForm';
import {
  MaintenanceRequest,
  MaintenanceRole,
  PriorityLevel,
  RequestStatus,
  SubmitMaintenanceInput,
  IssueCategory,
} from './types';

interface MaintenanceFlowProps {
  defaultRole?: MaintenanceRole;
}

type ViewMode = 'list' | 'board';

const POLL_INTERVAL_MS = 15000;

interface MaintenanceApiMedia {
  id?: string | number;
  name?: string;
  url?: string;
  type?: string;
}

interface MaintenanceApiRequest {
  id?: string | number;
  propertyId?: string;
  property_id?: string;
  propertyName?: string;
  property_name?: string;
  category?: string;
  description?: string;
  priority?: string;
  status?: string;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
  tenantName?: string;
  tenant_name?: string;
  contractorName?: string;
  contractor_name?: string;
  scheduledVisit?: string;
  scheduled_visit?: string;
  media?: MaintenanceApiMedia[];
}

const resolveCategory = (value: string | undefined): IssueCategory => {
  if (!value) return 'Other';
  return ISSUE_CATEGORIES.includes(value as IssueCategory)
    ? (value as IssueCategory)
    : 'Other';
};

const resolvePriority = (value: string | undefined): PriorityLevel => {
  if (!value) return 'normal';
  return PRIORITY_LEVELS.includes(value as PriorityLevel)
    ? (value as PriorityLevel)
    : 'normal';
};

const resolveStatus = (value: string | undefined): RequestStatus => {
  if (!value) return 'open';
  return STATUS_OPTIONS.includes(value as RequestStatus)
    ? (value as RequestStatus)
    : 'open';
};

const mapIncomingRequest = (
  item: MaintenanceApiRequest,
): MaintenanceRequest => ({
  id: String(item.id),
  propertyId: String(item.propertyId ?? item.property_id ?? 'unknown-property'),
  propertyName: String(
    item.propertyName ?? item.property_name ?? 'Unknown Property',
  ),
  category: resolveCategory(item.category),
  description: String(item.description ?? ''),
  priority: resolvePriority(item.priority),
  status: resolveStatus(item.status),
  createdAt: new Date(
    item.createdAt ?? item.created_at ?? Date.now(),
  ).toISOString(),
  updatedAt: new Date(
    item.updatedAt ?? item.updated_at ?? Date.now(),
  ).toISOString(),
  tenantName: item.tenantName ?? item.tenant_name ?? undefined,
  contractorName: item.contractorName ?? item.contractor_name ?? undefined,
  scheduledVisit: item.scheduledVisit ?? item.scheduled_visit ?? undefined,
  media: Array.isArray(item.media)
    ? item.media.map((media) => ({
        id: String(media.id ?? crypto.randomUUID()),
        name: String(media.name ?? 'attachment'),
        url: String(media.url ?? ''),
        type: String(media.type ?? 'application/octet-stream'),
      }))
    : [],
});

export default function MaintenanceFlow({
  defaultRole = 'tenant',
}: MaintenanceFlowProps) {
  const user = useAuthStore((state) => state.user);
  const effectiveRole: MaintenanceRole = user?.role ?? defaultRole;
  const isTenant = effectiveRole === 'tenant';
  const isManager = effectiveRole === 'landlord' || effectiveRole === 'agent';

  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [propertyFilter, setPropertyFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | RequestStatus>(
    'all',
  );
  const [newCount, setNewCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const seenIdsRef = useRef<Set<string>>(new Set());

  const loadRequests = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const response = await fetch('/api/maintenance', { cache: 'no-store' });
      if (!response.ok) throw new Error('Failed to load maintenance requests.');

      const payload = await response.json();
      const rawItems = Array.isArray(payload) ? payload : (payload.data ?? []);
      const mapped = (rawItems as MaintenanceApiRequest[]).map(
        mapIncomingRequest,
      );
      const sorted = mapped.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );

      if (seenIdsRef.current.size === 0) {
        seenIdsRef.current = new Set(sorted.map((item) => item.id));
      } else if (silent) {
        const incomingNew = sorted.filter(
          (item) => !seenIdsRef.current.has(item.id),
        ).length;
        if (incomingNew > 0) {
          setNewCount((count) => count + incomingNew);
          seenIdsRef.current = new Set([
            ...seenIdsRef.current,
            ...sorted.map((item) => item.id),
          ]);
        }
      }

      setRequests(sorted);
      setError(null);
    } catch {
      setRequests([]);
      if (!silent) {
        setError('Unable to load maintenance requests right now.');
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  useEffect(() => {
    const timer = setInterval(() => {
      loadRequests(true);
    }, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [loadRequests]);

  const handleSubmitRequest = async (
    input: SubmitMaintenanceInput,
  ): Promise<boolean> => {
    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('propertyId', input.propertyId);
      formData.append('category', input.category);
      formData.append('description', input.description);
      formData.append('priority', input.priority);
      input.files.forEach((file) => formData.append('media', file));

      const response = await fetch('/api/maintenance', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok)
        throw new Error('Failed to submit maintenance request.');
      const created = mapIncomingRequest(await response.json());
      setRequests((current) => [created, ...current]);
      seenIdsRef.current = new Set([...seenIdsRef.current, created.id]);
      setError(null);
      return true;
    } catch {
      setError('Unable to submit maintenance request. Please try again.');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const stream = new EventSource('/api/maintenance/stream');
    stream.onmessage = () => {
      loadRequests(true);
    };
    stream.onerror = () => {
      stream.close();
    };

    return () => stream.close();
  }, [loadRequests]);

  const handleUpdateRequest = async (
    id: string,
    patch: Partial<MaintenanceRequest>,
  ): Promise<void> => {
    try {
      const response = await fetch(`/api/maintenance/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      if (!response.ok)
        throw new Error('Failed to update maintenance request.');

      const updated = mapIncomingRequest(await response.json());
      setRequests((current) =>
        current.map((item) => (item.id === id ? updated : item)),
      );
      setError(null);
    } catch {
      setError('Unable to update request. Please try again.');
    }
  };

  const filtered = useMemo(() => {
    return requests.filter((item) => {
      if (propertyFilter !== 'all' && item.propertyId !== propertyFilter)
        return false;
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;
      return true;
    });
  }, [propertyFilter, requests, statusFilter]);

  const grouped = useMemo(() => {
    return STATUS_OPTIONS.reduce(
      (acc, status) => {
        acc[status] = filtered.filter((item) => item.status === status);
        return acc;
      },
      {
        open: [] as MaintenanceRequest[],
        in_progress: [] as MaintenanceRequest[],
        resolved: [] as MaintenanceRequest[],
        closed: [] as MaintenanceRequest[],
      },
    );
  }, [filtered]);

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-10 bg-gray-200 rounded-lg animate-pulse" />
        <div className="h-24 bg-gray-200 rounded-lg animate-pulse" />
        <div className="h-24 bg-gray-200 rounded-lg animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {isTenant && (
        <MaintenanceRequestForm
          properties={DEFAULT_PROPERTIES}
          isSubmitting={isSubmitting}
          onSubmit={handleSubmitRequest}
        />
      )}

      <section className="bg-white border border-gray-200 rounded-xl p-4 md:p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-neutral-900">
              Maintenance Requests
            </h2>
            <p className="text-sm text-gray-600">
              {isManager
                ? 'Review incoming issues, assign contractors and track progress.'
                : 'Track status updates for your submitted requests.'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('list')}
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm border ${
                viewMode === 'list'
                  ? 'bg-[#1e40af] text-white border-[#1e40af]'
                  : 'bg-white text-gray-700 border-gray-300'
              }`}
            >
              <List size={16} />
              List
            </button>
            <button
              onClick={() => setViewMode('board')}
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm border ${
                viewMode === 'board'
                  ? 'bg-[#1e40af] text-white border-[#1e40af]'
                  : 'bg-white text-gray-700 border-gray-300'
              }`}
            >
              <LayoutGrid size={16} />
              Board
            </button>
          </div>
        </div>

        {isManager && newCount > 0 && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700 flex items-center gap-2">
            <BellRing size={16} />
            {newCount} new maintenance request{newCount > 1 ? 's' : ''}{' '}
            received.
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {isManager && (
          <div className="flex flex-col md:flex-row gap-3">
            <label className="flex-1 flex items-center gap-2 border border-gray-300 rounded-lg px-3 py-2.5 bg-gray-50">
              <Filter size={16} className="text-gray-500" />
              <select
                value={propertyFilter}
                onChange={(event) => setPropertyFilter(event.target.value)}
                className="w-full bg-transparent outline-none text-sm"
              >
                <option value="all">All properties</option>
                {DEFAULT_PROPERTIES.map((property) => (
                  <option key={property.id} value={property.id}>
                    {property.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex-1 flex items-center gap-2 border border-gray-300 rounded-lg px-3 py-2.5 bg-gray-50">
              <Filter size={16} className="text-gray-500" />
              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as 'all' | RequestStatus)
                }
                className="w-full bg-transparent outline-none text-sm"
              >
                <option value="all">All statuses</option>
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {STATUS_LABELS[status]}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}

        {filtered.length === 0 ? (
          <EmptyState
            icon={Filter}
            title="No maintenance requests"
            description="Try adjusting filters or submit your first maintenance issue."
          />
        ) : viewMode === 'list' ? (
          <div className="space-y-3">
            {filtered.map((request) => (
              <MaintenanceRequestCard
                key={request.id}
                request={request}
                showManagementControls={isManager}
                onUpdateRequest={handleUpdateRequest}
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {STATUS_OPTIONS.map((status) => (
              <div
                key={status}
                className="rounded-lg border border-gray-200 bg-gray-50 p-3"
              >
                <h3 className="font-semibold text-sm text-gray-800 mb-2">
                  {STATUS_LABELS[status]} ({grouped[status].length})
                </h3>
                <div className="space-y-3">
                  {grouped[status].map((request) => (
                    <MaintenanceRequestCard
                      key={request.id}
                      request={request}
                      showManagementControls={isManager}
                      onUpdateRequest={handleUpdateRequest}
                    />
                  ))}
                  {grouped[status].length === 0 && (
                    <p className="text-xs text-gray-500">
                      No requests in this column.
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
