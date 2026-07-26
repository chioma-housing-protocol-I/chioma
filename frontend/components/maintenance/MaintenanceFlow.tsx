'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Filter, List, LayoutGrid, BellRing } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { DEFAULT_PROPERTIES, STATUS_LABELS, STATUS_OPTIONS } from './config';
import MaintenanceRequestCard from './MaintenanceRequestCard';
import MaintenanceRequestForm from './MaintenanceRequestForm';
import {
  fetchMaintenanceRequests,
  submitMaintenanceRequest,
  updateMaintenanceRequest,
} from './api';
import {
  MaintenanceRequest,
  MaintenanceRole,
  RequestStatus,
  SubmitMaintenanceInput,
} from './types';

interface MaintenanceFlowProps {
  defaultRole?: MaintenanceRole;
}

type ViewMode = 'list' | 'board';

const POLL_INTERVAL_MS = 15000;

export default function MaintenanceFlow({
  defaultRole = 'user',
}: MaintenanceFlowProps) {
  const user = useAuthStore((state) => state.user);
  const effectiveRole: MaintenanceRole =
    (user?.role as MaintenanceRole) ?? defaultRole;
  const isUser = effectiveRole === 'user';
  const isManager = effectiveRole === 'admin';

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
      const sorted = await fetchMaintenanceRequests();

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
      const created = await submitMaintenanceRequest(input);
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
      const updated = await updateMaintenanceRequest(id, patch);
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
      <div className="space-y-4">
        <div className="h-12 bg-white/5 border border-white/10 rounded-2xl animate-pulse" />
        <div className="h-40 bg-white/5 border border-white/10 rounded-3xl animate-pulse" />
        <div className="h-40 bg-white/5 border border-white/10 rounded-3xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {isUser && (
        <MaintenanceRequestForm
          properties={DEFAULT_PROPERTIES}
          isSubmitting={isSubmitting}
          onSubmit={handleSubmitRequest}
        />
      )}

      <section className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-6 md:p-8 space-y-8 shadow-2xl relative overflow-hidden group">
        <div className="absolute -right-24 -top-24 w-96 h-96 rounded-full bg-blue-600 blur-[120px] opacity-10 group-hover:opacity-20 transition-opacity duration-700" />

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 relative z-10">
          <div>
            <h2 className="text-2xl font-black text-white tracking-tight">
              Maintenance Requests
            </h2>
            <p className="text-sm font-medium text-blue-200/40 mt-1">
              {isManager
                ? 'Review incoming issues, assign contractors and track progress.'
                : 'Track status updates for your submitted requests.'}
            </p>
          </div>

          <div className="flex items-center gap-3 bg-white/5 p-1.5 rounded-2xl border border-white/5">
            <button
              onClick={() => setViewMode('list')}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-[10px] font-bold uppercase tracking-widest transition-all duration-300 ${
                viewMode === 'list'
                  ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.3)]'
                  : 'text-blue-200/40 hover:text-white hover:bg-white/5'
              }`}
            >
              <List size={14} />
              List
            </button>
            <button
              onClick={() => setViewMode('board')}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-[10px] font-bold uppercase tracking-widest transition-all duration-300 ${
                viewMode === 'board'
                  ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.3)]'
                  : 'text-blue-200/40 hover:text-white hover:bg-white/5'
              }`}
            >
              <LayoutGrid size={14} />
              Board
            </button>
          </div>
        </div>

        {isManager && newCount > 0 && (
          <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 px-4 py-3 text-xs font-bold uppercase tracking-widest text-blue-400 flex items-center gap-3 relative z-10 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="h-2 w-2 rounded-full bg-blue-400 animate-pulse" />
            <BellRing size={14} />
            {newCount} new maintenance request{newCount > 1 ? 's' : ''}{' '}
            received.
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs font-bold uppercase tracking-widest text-red-400 flex items-center gap-3 relative z-10">
            <div className="h-2 w-2 rounded-full bg-red-400 animate-pulse" />
            {error}
          </div>
        )}

        {isManager && (
          <div className="flex flex-col md:flex-row gap-4 relative z-10">
            <label className="flex-1 flex items-center gap-3 border border-white/10 rounded-2xl px-4 py-3 bg-white/5 focus-within:border-blue-500/40 transition-colors group/select">
              <Filter
                size={14}
                className="text-blue-200/40 group-focus-within/select:text-blue-400 transition-colors"
              />
              <select
                value={propertyFilter}
                onChange={(event) => setPropertyFilter(event.target.value)}
                className="w-full bg-transparent outline-none text-[10px] font-bold uppercase tracking-widest text-blue-200/60 transition-colors"
                style={{ appearance: 'none' }}
              >
                <option value="all" className="bg-slate-900">
                  All properties
                </option>
                {DEFAULT_PROPERTIES.map((property) => (
                  <option
                    key={property.id}
                    value={property.id}
                    className="bg-slate-900"
                  >
                    {property.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex-1 flex items-center gap-3 border border-white/10 rounded-2xl px-4 py-3 bg-white/5 focus-within:border-blue-500/40 transition-colors group/select">
              <Filter
                size={14}
                className="text-blue-200/40 group-focus-within/select:text-blue-400 transition-colors"
              />
              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as 'all' | RequestStatus)
                }
                className="w-full bg-transparent outline-none text-[10px] font-bold uppercase tracking-widest text-blue-200/60 transition-colors"
                style={{ appearance: 'none' }}
              >
                <option value="all" className="bg-slate-900">
                  All statuses
                </option>
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status} className="bg-slate-900">
                    {STATUS_LABELS[status]}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}

        {filtered.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-white/10 bg-white/5 py-24 text-center relative z-10">
            <div className="mx-auto w-16 h-16 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center mb-6">
              <Filter className="w-8 h-8 text-blue-200/20" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">
              No maintenance requests
            </h3>
            <p className="text-sm font-medium text-blue-200/40">
              Try adjusting filters or submit your first maintenance issue.
            </p>
          </div>
        ) : viewMode === 'list' ? (
          <div className="space-y-4 relative z-10">
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
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 relative z-10">
            {STATUS_OPTIONS.map((status) => (
              <div
                key={status}
                className="rounded-3xl border border-white/10 bg-white/5 p-5"
              >
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400">
                    {STATUS_LABELS[status]}
                  </h3>
                  <span className="h-6 w-6 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-[10px] font-bold text-blue-200/40">
                    {grouped[status].length}
                  </span>
                </div>
                <div className="space-y-4">
                  {grouped[status].map((request) => (
                    <MaintenanceRequestCard
                      key={request.id}
                      request={request}
                      showManagementControls={isManager}
                      onUpdateRequest={handleUpdateRequest}
                    />
                  ))}
                  {grouped[status].length === 0 && (
                    <div className="rounded-2xl border border-dashed border-white/5 bg-white/[0.02] py-8 text-center">
                      <p className="text-[10px] font-bold text-blue-200/10 uppercase tracking-widest">
                        Empty column
                      </p>
                    </div>
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
