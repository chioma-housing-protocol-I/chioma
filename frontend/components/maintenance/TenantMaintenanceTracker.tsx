'use client';

import React, { useState, useEffect } from 'react';
import {
  Wrench,
  Clock,
  CheckCircle,
  AlertCircle,
  Plus,
  Filter,
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

// Mock maintenance requests for tenant view
const mockMaintenanceRequests: MaintenanceRequest[] = [
  {
    id: '1',
    propertyId: 'prop-1',
    propertyName: 'Sunset View Apartments - Unit 4B',
    category: 'Plumbing',
    description:
      'Kitchen sink is leaking and causing water damage under the cabinet. The leak started yesterday and has gotten worse.',
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

interface TenantMaintenanceTrackerProps {
  className?: string;
}

export default function TenantMaintenanceTracker({
  className = '',
}: TenantMaintenanceTrackerProps) {
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [statusFilter, setStatusFilter] = useState<
    'all' | MaintenanceRequest['status']
  >('all');
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    // Simulate API call
    const loadRequests = async () => {
      setLoading(true);
      // In real app: fetch from /api/maintenance?tenantId=${user.id}
      await new Promise((resolve) => setTimeout(resolve, 500));
      setRequests(mockMaintenanceRequests);
      setLoading(false);
    };

    loadRequests();
  }, [user?.id]);

  const handleSubmitRequest = async (input: {
    propertyId: string;
    category: string;
    description: string;
    priority: string;
    files: File[];
  }): Promise<boolean> => {
    setIsSubmitting(true);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Add new request to list
      const newRequest: MaintenanceRequest = {
        id: String(Date.now()),
        propertyId: input.propertyId,
        propertyName: 'Sunset View Apartments - Unit 4B', // Would get from API
        category: input.category as IssueCategory,
        description: input.description,
        priority: input.priority as PriorityLevel,
        status: 'open',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        media: [],
      };

      setRequests((prev) => [newRequest, ...prev]);
      setShowForm(false);
      return true;
    } catch (error) {
      console.error('Failed to submit request:', error);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredRequests =
    statusFilter === 'all'
      ? requests
      : requests.filter((r) => r.status === statusFilter);

  const statusCounts = {
    all: requests.length,
    open: requests.filter((r) => r.status === 'open').length,
    in_progress: requests.filter((r) => r.status === 'in_progress').length,
    resolved: requests.filter((r) => r.status === 'resolved').length,
    closed: requests.filter((r) => r.status === 'closed').length,
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getStatusIcon = (status: MaintenanceRequest['status']) => {
    switch (status) {
      case 'open':
        return AlertCircle;
      case 'in_progress':
        return Clock;
      case 'resolved':
        return CheckCircle;
      case 'closed':
        return CheckCircle;
      default:
        return Wrench;
    }
  };

  if (loading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="h-8 bg-gray-200 rounded-lg animate-pulse" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-32 bg-gray-200 rounded-lg animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-neutral-900">
            Maintenance Requests
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Track and manage your maintenance requests
          </p>
        </div>

        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={18} />
          New Request
        </button>
      </div>

      {/* Status Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            status: 'all',
            label: 'All Requests',
            count: statusCounts.all,
            color: 'bg-gray-50 text-gray-700 border-gray-200',
          },
          {
            status: 'open',
            label: 'Open',
            count: statusCounts.open,
            color: 'bg-red-50 text-red-700 border-red-200',
          },
          {
            status: 'in_progress',
            label: 'In Progress',
            count: statusCounts.in_progress,
            color: 'bg-amber-50 text-amber-700 border-amber-200',
          },
          {
            status: 'resolved',
            label: 'Resolved',
            count: statusCounts.resolved,
            color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          },
        ].map(({ status, label, count, color }) => (
          <button
            key={status}
            onClick={() =>
              setStatusFilter(status as 'all' | MaintenanceRequest['status'])
            }
            className={`p-3 rounded-lg border transition-all ${
              statusFilter === status
                ? `${color} ring-2 ring-offset-2 ring-blue-500`
                : 'bg-white border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="text-2xl font-bold">{count}</div>
            <div className="text-xs font-medium mt-1">{label}</div>
          </button>
        ))}
      </div>

      {/* New Request Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Submit New Maintenance Request
            </h3>
            <button
              onClick={() => setShowForm(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>
          <MaintenanceRequestForm
            properties={[
              { id: 'prop-1', name: 'Sunset View Apartments - Unit 4B' },
              { id: 'prop-2', name: 'Pine Tree Townhouse' },
            ]}
            isSubmitting={isSubmitting}
            onSubmit={handleSubmitRequest}
          />
        </div>
      )}

      {/* Filter */}
      <div className="flex items-center gap-2">
        <Filter size={16} className="text-gray-500" />
        <select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(
              e.target.value as 'all' | MaintenanceRequest['status'],
            )
          }
          className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white"
        >
          <option value="all">All Statuses</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      {/* Requests List */}
      <div className="space-y-4">
        {filteredRequests.length === 0 ? (
          <div className="text-center py-12">
            <Wrench className="mx-auto h-12 w-12 text-gray-400 mb-3" />
            <p className="text-gray-500">No maintenance requests found</p>
            <p className="text-sm text-gray-400 mt-1">
              {statusFilter !== 'all'
                ? 'Try selecting a different status filter'
                : 'Submit your first maintenance request to get started'}
            </p>
          </div>
        ) : (
          filteredRequests.map((request) => {
            const StatusIcon = getStatusIcon(request.status);

            return (
              <div
                key={request.id}
                className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="p-5">
                  <div className="flex items-start gap-4">
                    {/* Status Icon */}
                    <div
                      className={`p-2 rounded-lg ${STATUS_STYLES[request.status]}`}
                    >
                      <StatusIcon size={20} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 mb-1">
                            {request.category} - {request.propertyName}
                          </h3>
                          <p className="text-gray-600 text-sm leading-relaxed">
                            {request.description}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${STATUS_STYLES[request.status]}`}
                          >
                            {STATUS_LABELS[request.status]}
                          </span>
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${PRIORITY_STYLES[request.priority]}`}
                          >
                            {PRIORITY_LABELS[request.priority]}
                          </span>
                        </div>
                      </div>

                      {/* Additional Info */}
                      <div className="flex items-center gap-4 text-xs text-gray-500 mt-3 pt-3 border-t border-gray-100">
                        <span>Requested {formatDate(request.createdAt)}</span>
                        {request.contractorName && (
                          <span>Assigned to {request.contractorName}</span>
                        )}
                        {request.scheduledVisit && (
                          <span className="text-amber-600 font-medium">
                            Scheduled for {formatDate(request.scheduledVisit)}
                          </span>
                        )}
                      </div>
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
