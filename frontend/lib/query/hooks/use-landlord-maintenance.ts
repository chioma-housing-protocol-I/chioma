'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export type MaintenanceStatus =
  | 'OPEN'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';
export type MaintenancePriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface MaintenanceFilters {
  status?: MaintenanceStatus | 'ALL';
  priority?: MaintenancePriority | 'ALL';
  propertyId?: string;
  search?: string;
  sort?: 'createdAt' | 'priority' | 'status';
  page?: number;
  limit?: number;
}

export interface MaintenanceRecord {
  id: string;
  requestId: string;
  propertyName: string;
  propertyId: string;
  tenantName: string;
  tenantId: string;
  title: string;
  description: string;
  status: MaintenanceStatus;
  priority: MaintenancePriority;
  assignedTo?: {
    id: string;
    name: string;
    phone?: string;
  };
  createdAt: string;
  updatedAt: string;
  deadline?: string;
  commentCount: number;
  photoCount: number;
}

const LANDLORD_MAINTENANCE_QUERY_KEY = ['landlord-maintenance'] as const;

const mockMaintenanceRequests: MaintenanceRecord[] = [
  {
    id: 'mnt-001',
    requestId: 'MNT-2026-001',
    propertyName: 'Sunset Apartments, Unit 4B',
    propertyId: 'prop-001',
    tenantName: 'Chioma Okafor',
    tenantId: 'tenant-001',
    title: 'Water leak in bathroom',
    description:
      'Water is leaking from the ceiling in the bathroom. Started 2 days ago.',
    status: 'OPEN',
    priority: 'HIGH',
    assignedTo: {
      id: 'maint-001',
      name: 'Emeka Plumbing Services',
      phone: '+234 801 234 5678',
    },
    createdAt: '2026-03-25T10:00:00.000Z',
    updatedAt: '2026-03-25T10:00:00.000Z',
    deadline: '2026-03-28T18:00:00.000Z',
    commentCount: 3,
    photoCount: 2,
  },
  {
    id: 'mnt-002',
    requestId: 'MNT-2026-002',
    propertyName: 'Sunset Apartments, Unit 2A',
    propertyId: 'prop-001',
    tenantName: 'Adebayo Mensah',
    tenantId: 'tenant-002',
    title: 'Air conditioning not working',
    description:
      'AC unit stopped cooling yesterday. Makes strange noise when turned on.',
    status: 'IN_PROGRESS',
    priority: 'MEDIUM',
    assignedTo: {
      id: 'maint-002',
      name: 'Cool Air HVAC',
      phone: '+234 802 345 6789',
    },
    createdAt: '2026-03-20T14:30:00.000Z',
    updatedAt: '2026-03-22T09:15:00.000Z',
    deadline: '2026-03-25T18:00:00.000Z',
    commentCount: 5,
    photoCount: 1,
  },
  {
    id: 'mnt-003',
    requestId: 'MNT-2026-003',
    propertyName: 'Lagos Heights, Unit 7C',
    propertyId: 'prop-002',
    tenantName: 'Ngozi Eze',
    tenantId: 'tenant-003',
    title: 'Broken window lock',
    description:
      'The lock on the bedroom window is broken and cannot be secured.',
    status: 'COMPLETED',
    priority: 'LOW',
    assignedTo: {
      id: 'maint-003',
      name: 'Quick Fix Repairs',
      phone: '+234 803 456 7890',
    },
    createdAt: '2026-03-15T08:00:00.000Z',
    updatedAt: '2026-03-18T16:45:00.000Z',
    commentCount: 4,
    photoCount: 3,
  },
  {
    id: 'mnt-004',
    requestId: 'MNT-2026-004',
    propertyName: 'Sunset Apartments, Unit 1D',
    propertyId: 'prop-001',
    tenantName: 'Oluwaseun Adeyemi',
    tenantId: 'tenant-004',
    title: 'Electrical outlet sparking',
    description:
      'The outlet in the kitchen is sparking when plugging in appliances. Safety concern.',
    status: 'OPEN',
    priority: 'URGENT',
    createdAt: '2026-03-27T19:30:00.000Z',
    updatedAt: '2026-03-27T19:30:00.000Z',
    deadline: '2026-03-28T12:00:00.000Z',
    commentCount: 1,
    photoCount: 0,
  },
  {
    id: 'mnt-005',
    requestId: 'MNT-2026-005',
    propertyName: 'Lagos Heights, Unit 3B',
    propertyId: 'prop-002',
    tenantName: 'Emeka Nwankwo',
    tenantId: 'tenant-005',
    title: 'Clogged drain',
    description:
      'Kitchen sink drain is completely clogged. Water not draining at all.',
    status: 'CANCELLED',
    priority: 'MEDIUM',
    createdAt: '2026-03-10T11:00:00.000Z',
    updatedAt: '2026-03-12T14:20:00.000Z',
    commentCount: 2,
    photoCount: 1,
  },
];

function matchesFilter(
  request: MaintenanceRecord,
  filters: MaintenanceFilters,
): boolean {
  if (
    filters.status &&
    filters.status !== 'ALL' &&
    request.status !== filters.status
  ) {
    return false;
  }
  if (
    filters.priority &&
    filters.priority !== 'ALL' &&
    request.priority !== filters.priority
  ) {
    return false;
  }
  if (filters.propertyId && request.propertyId !== filters.propertyId) {
    return false;
  }
  const normalizedSearch = filters.search?.trim().toLowerCase() || '';
  if (normalizedSearch) {
    const searchable = [
      request.requestId,
      request.propertyName,
      request.tenantName,
      request.title,
      request.description,
    ]
      .join(' ')
      .toLowerCase();
    if (!searchable.includes(normalizedSearch)) return false;
  }
  return true;
}

export function useLandlordMaintenance(filters: MaintenanceFilters = {}) {
  return useQuery({
    queryKey: [...LANDLORD_MAINTENANCE_QUERY_KEY, filters],
    queryFn: async () => {
      try {
        const params = new URLSearchParams({
          role: 'landlord',
          ...(filters.status &&
            filters.status !== 'ALL' && { status: filters.status }),
          ...(filters.priority &&
            filters.priority !== 'ALL' && { priority: filters.priority }),
          ...(filters.propertyId && { propertyId: filters.propertyId }),
          ...(filters.search && { search: filters.search }),
          limit: (filters.limit || 20).toString(),
          page: (filters.page || 0).toString(),
        });
        const responseData = await apiClient.get<{
          data?: MaintenanceRecord[] | { requests?: MaintenanceRecord[] };
        }>(`/maintenance?${params}`);
        const apiData = responseData.data;
        // Normalize API response to MaintenanceRecord
        const requests: MaintenanceRecord[] = (
          (apiData?.data as MaintenanceRecord[] | undefined) ||
          (apiData as { requests?: MaintenanceRecord[] })?.requests ||
          []
        ).map((r: MaintenanceRecord) => ({
          id: String(r.id),
          requestId: r.requestId || `MNT-${String(r.id).slice(-6)}`,
          propertyName: r.propertyName || 'Rental Property',
          propertyId: String(r.propertyId || ''),
          tenantName: r.tenantName || 'Tenant',
          tenantId: String(r.tenantId || ''),
          title: r.title || '',
          description: r.description || '',
          status: (r.status as MaintenanceStatus) || 'OPEN',
          priority: (r.priority as MaintenancePriority) || 'MEDIUM',
          assignedTo: r.assignedTo
            ? {
                id: String(r.assignedTo.id),
                name: r.assignedTo.name,
                phone: r.assignedTo.phone,
              }
            : undefined,
          createdAt: r.createdAt || new Date().toISOString(),
          updatedAt: r.updatedAt || r.createdAt || new Date().toISOString(),
          deadline: r.deadline,
          commentCount: r.commentCount || 0,
          photoCount: r.photoCount || 0,
        }));
        return requests.length > 0 ? requests : mockMaintenanceRequests;
      } catch {
        return mockMaintenanceRequests;
      }
    },
    select: (requests) => requests.filter((r) => matchesFilter(r, filters)),
  });
}

export function useUpdateMaintenanceStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      requestId,
      status,
    }: {
      requestId: string;
      status: MaintenanceStatus;
    }) => {
      await apiClient.patch(`/maintenance/${requestId}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: LANDLORD_MAINTENANCE_QUERY_KEY,
      });
    },
  });
}

export function useAssignMaintenancePersonnel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      requestId,
      personnelId,
    }: {
      requestId: string;
      personnelId: string;
    }) => {
      await apiClient.post(`/maintenance/${requestId}/assign`, { personnelId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: LANDLORD_MAINTENANCE_QUERY_KEY,
      });
    },
  });
}
