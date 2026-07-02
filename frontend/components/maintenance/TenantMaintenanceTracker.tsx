'use client';

import React, { useState, useEffect } from 'react';
import {
  Wrench,
  Clock,
  CheckCircle,
  AlertCircle,
  Plus,
  Filter,
  X,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import {
  STATUS_LABELS,
  STATUS_STYLES,
  PRIORITY_LABELS,
  PRIORITY_STYLES,
} from '@/components/maintenance/config';
import type {
  MaintenanceRequest,
  IssueCategory,
  PriorityLevel,
} from '@/components/maintenance/types';
import MaintenanceRequestForm from '@/components/maintenance/MaintenanceRequestForm';

const mockRequests: MaintenanceRequest[] = [
  {
    id: '1',
    propertyId: 'prop-1',
    propertyName: 'Sunset View Apartments - Unit 4B',
    category: 'Plumbing',
    description:
      'Kitchen sink is leaking and causing water damage under the cabinet.',
    priority: 'urgent',
    status: 'in_progress',
    createdAt: '2024-03-14T10:30:00Z',
    updatedAt: '2024-03-15T14:20:00Z',
    contractorName: 'Quick Fix Plumbing Services',
    scheduledVisit: '2024-03-16T10:00:00Z',
    media: [],
  },
  {
    id: '2',
    propertyId: 'prop-1',
    propertyName: 'Sunset View Apartments - Unit 4B',
    category: 'Electrical',
    description:
      'Bedroom outlet is not working. Tried multiple devices and none are getting power.',
    priority: 'normal',
    status: 'open',
    createdAt: '2024-03-13T16:45:00Z',
    updatedAt: '2024-03-13T16:45:00Z',
    media: [],
  },
  {
    id: '3',
    propertyId: 'prop-2',
    propertyName: 'Pine Tree Townhouse',
    category: 'HVAC',
    description:
      'Air conditioning unit is making loud noises and not cooling properly.',
    priority: 'normal',
    status: 'resolved',
    createdAt: '2024-03-10T09:15:00Z',
    updatedAt: '2024-03-12T15:30:00Z',
    contractorName: 'Cool Air HVAC Services',
    media: [],
  },
];

const seedRequests = process.env.NODE_ENV === 'production' ? [] : mockRequests;

const statusCardStyles: Record<string, string> = {
  all: 'bg-white/5 border-white/10 text-white',
  open: 'bg-red-500/10 border-red-500/20 text-red-400',
  in_progress: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
  resolved: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
};

export default function TenantMaintenanceTracker({
  className = '',
}: {
  className?: string;
}) {
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [statusFilter, setStatusFilter] = useState<
    'all' | MaintenanceRequest['status']
  >('all');
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await new Promise((r) => setTimeout(r, 400));
      setRequests(seedRequests);
      setLoading(false);
    };
    void load();
  }, [user?.id]);

  const handleSubmit = async (input: {
    propertyId: string;
    category: string;
    description: string;
    priority: string;
    files: File[];
  }): Promise<boolean> => {
    setIsSubmitting(true);
    try {
      await new Promise((r) => setTimeout(r, 800));
      const newReq: MaintenanceRequest = {
        id: String(Date.now()),
        propertyId: input.propertyId,
        propertyName: 'Sunset View Apartments - Unit 4B',
        category: input.category as IssueCategory,
        description: input.description,
        priority: input.priority as PriorityLevel,
        status: 'open',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        media: [],
      };
      setRequests((prev) => [newReq, ...prev]);
      setShowForm(false);
      return true;
    } catch {
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const filtered =
    statusFilter === 'all'
      ? requests
      : requests.filter((r) => r.status === statusFilter);
  const counts = {
    all: requests.length,
    open: requests.filter((r) => r.status === 'open').length,
    in_progress: requests.filter((r) => r.status === 'in_progress').length,
    resolved: requests.filter((r) => r.status === 'resolved').length,
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

  const getStatusIcon = (status: MaintenanceRequest['status']) => {
    if (status === 'open') return AlertCircle;
    if (status === 'in_progress') return Clock;
    return CheckCircle;
  };

  if (loading) {
    return (
      <div className={`space-y-3 ${className}`}>
        <div className="h-7 bg-white/5 rounded-xl animate-pulse" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-28 bg-white/5 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className={`space-y-5 ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white">Maintenance Requests</h2>
          <p className="text-sm text-blue-200/40 mt-0.5">
            Track and manage your maintenance requests.
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
        >
          <Plus size={16} /> New Request
        </button>
      </div>

      {/* Status Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {(
          [
            ['all', 'All', counts.all],
            ['open', 'Open', counts.open],
            ['in_progress', 'In Progress', counts.in_progress],
            ['resolved', 'Resolved', counts.resolved],
          ] as const
        ).map(([status, label, count]) => (
          <button
            key={status}
            onClick={() =>
              setStatusFilter(status as 'all' | MaintenanceRequest['status'])
            }
            className={`p-3 rounded-xl border transition-all text-left ${statusCardStyles[status]} ${statusFilter === status ? 'ring-2 ring-blue-500/50 ring-offset-1 ring-offset-transparent' : 'opacity-70 hover:opacity-100'}`}
          >
            <div className="text-2xl font-black">{count}</div>
            <div className="text-xs font-semibold mt-0.5 opacity-80">
              {label}
            </div>
          </button>
        ))}
      </div>

      {/* New Request Form */}
      {showForm && (
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-white">
              Submit New Request
            </h3>
            <button
              onClick={() => setShowForm(false)}
              className="p-1.5 text-blue-200/40 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              <X size={16} />
            </button>
          </div>
          <MaintenanceRequestForm
            properties={[
              { id: 'prop-1', name: 'Sunset View Apartments - Unit 4B' },
              { id: 'prop-2', name: 'Pine Tree Townhouse' },
            ]}
            isSubmitting={isSubmitting}
            onSubmit={handleSubmit}
          />
        </div>
      )}

      {/* Filter */}
      <div className="flex items-center gap-2">
        <Filter size={14} className="text-blue-300/40" aria-hidden="true" />
        <select
          aria-label="Filter by status"
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(
              e.target.value as 'all' | MaintenanceRequest['status'],
            )
          }
          className="text-sm bg-white/5 border border-white/10 text-white rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/30 appearance-none cursor-pointer"
        >
          <option value="all" className="bg-slate-900">
            All Statuses
          </option>
          <option value="open" className="bg-slate-900">
            Open
          </option>
          <option value="in_progress" className="bg-slate-900">
            In Progress
          </option>
          <option value="resolved" className="bg-slate-900">
            Resolved
          </option>
          <option value="closed" className="bg-slate-900">
            Closed
          </option>
        </select>
      </div>

      {/* Requests */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-12">
            <Wrench className="mx-auto h-10 w-10 text-blue-300/20 mb-3" />
            <p className="text-blue-200/40">No maintenance requests found.</p>
          </div>
        ) : (
          filtered.map((req) => {
            const StatusIcon = getStatusIcon(req.status);
            return (
              <div
                key={req.id}
                className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-5 hover:border-white/20 transition-all"
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`p-2 rounded-xl border shrink-0 ${STATUS_STYLES[req.status]}`}
                  >
                    <StatusIcon size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 mb-1.5">
                      <div>
                        <h3 className="font-semibold text-white text-sm">
                          {req.category} — {req.propertyName}
                        </h3>
                        <p className="text-blue-200/60 text-sm mt-0.5 leading-relaxed">
                          {req.description}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <span
                          className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${STATUS_STYLES[req.status]}`}
                        >
                          {STATUS_LABELS[req.status]}
                        </span>
                        <span
                          className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${PRIORITY_STYLES[req.priority]}`}
                        >
                          {PRIORITY_LABELS[req.priority]}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-blue-200/30 mt-3 pt-3 border-t border-white/5">
                      <span>Requested {formatDate(req.createdAt)}</span>
                      {req.contractorName && (
                        <span>Assigned to {req.contractorName}</span>
                      )}
                      {req.scheduledVisit && (
                        <span className="text-amber-400/70 font-medium">
                          Scheduled {formatDate(req.scheduledVisit)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
