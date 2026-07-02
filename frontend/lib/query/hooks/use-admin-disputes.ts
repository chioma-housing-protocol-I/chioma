'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export type AdminDisputeStatus =
  | 'OPEN'
  | 'UNDER_REVIEW'
  | 'RESOLVED'
  | 'REJECTED'
  | 'WITHDRAWN';

export type AdminDisputeType =
  | 'RENT_PAYMENT'
  | 'SECURITY_DEPOSIT'
  | 'PROPERTY_DAMAGE'
  | 'MAINTENANCE'
  | 'TERMINATION'
  | 'OTHER';

export interface AdminDisputeRecord {
  id: string;
  disputeId: string;
  agreementReference: string;
  propertyName: string;
  raisedByName: string;
  againstName: string;
  disputeType: AdminDisputeType;
  description: string;
  status: AdminDisputeStatus;
  priority: 'low' | 'medium' | 'high';
  requestedAmount?: number;
  resolution?: string;
  evidenceCount: number;
  commentCount: number;
  createdAt: string;
  updatedAt: string;
}

interface DisputesResponse {
  disputes?: ApiDispute[];
  data?: ApiDispute[];
}

interface ApiDispute {
  id: number | string;
  disputeId?: string;
  agreementId?: number | string;
  title?: string;
  disputeType?: AdminDisputeType;
  description?: string;
  status?: AdminDisputeStatus;
  requestedAmount?: number;
  resolution?: string;
  createdAt?: string;
  updatedAt?: string;
  evidence?: Array<unknown>;
  comments?: Array<unknown>;
  raisedByUser?: {
    name?: string;
    email?: string;
  };
  againstUser?: {
    name?: string;
    email?: string;
  };
  priority?: 'low' | 'medium' | 'high';
}

export interface AdminDisputeFilters {
  status?: AdminDisputeStatus | 'ALL';
  search?: string;
}

const ADMIN_DISPUTES_QUERY_KEY = ['admin-disputes'] as const;

const mockDisputes: AdminDisputeRecord[] = [
  {
    id: 'dis-101',
    disputeId: 'DSP-2026-004',
    agreementReference: 'AGR-2025-021',
    propertyName: 'Glover Road, Ikoyi',
    raisedByName: 'Ada Nwosu',
    againstName: 'James Adebayo',
    disputeType: 'RENT_PAYMENT',
    description:
      'Tenant reported a duplicate rent debit after manual settlement was recorded.',
    status: 'OPEN',
    priority: 'high',
    requestedAmount: 180000,
    evidenceCount: 1,
    commentCount: 1,
    createdAt: '2026-03-04T08:45:00.000Z',
    updatedAt: '2026-03-04T08:45:00.000Z',
  },
  {
    id: 'dis-102',
    disputeId: 'DSP-2026-002',
    agreementReference: 'AGR-2025-010',
    propertyName: 'Admiralty Way, Block 4',
    raisedByName: 'Kunle Bello',
    againstName: 'Facility Ops',
    disputeType: 'PROPERTY_DAMAGE',
    description:
      'Checkout inspection found damage to the kitchen cabinet and broken smoke detectors.',
    status: 'UNDER_REVIEW',
    priority: 'medium',
    requestedAmount: 95000,
    evidenceCount: 4,
    commentCount: 5,
    createdAt: '2026-02-09T17:30:00.000Z',
    updatedAt: '2026-03-03T10:00:00.000Z',
  },
  {
    id: 'dis-103',
    disputeId: 'DSP-2026-001',
    agreementReference: 'AGR-2025-014',
    propertyName: 'Sunset Apartments, Unit 4B',
    raisedByName: 'Counterparty',
    againstName: 'Support Review Queue',
    disputeType: 'MAINTENANCE',
    description:
      'Water damage repairs were delayed for 12 days after the issue was reported.',
    status: 'RESOLVED',
    priority: 'medium',
    requestedAmount: 40000,
    resolution:
      'Service provider confirmed the repair and landlord issued a rent credit.',
    evidenceCount: 3,
    commentCount: 4,
    createdAt: '2026-02-18T10:00:00.000Z',
    updatedAt: '2026-03-06T13:20:00.000Z',
  },
];

function normalizeDispute(dispute: ApiDispute): AdminDisputeRecord {
  const status = dispute.status ?? 'OPEN';

  return {
    id: String(dispute.id),
    disputeId:
      dispute.disputeId ?? `DSP-${String(dispute.id).padStart(6, '0')}`,
    agreementReference: String(dispute.agreementId ?? 'Agreement'),
    propertyName: dispute.title ?? 'Linked rental agreement',
    raisedByName:
      dispute.raisedByUser?.name ?? dispute.raisedByUser?.email ?? 'Reporter',
    againstName:
      dispute.againstUser?.name ?? dispute.againstUser?.email ?? 'Counterparty',
    disputeType: dispute.disputeType ?? 'OTHER',
    description: dispute.description ?? 'No dispute narrative provided.',
    status,
    priority:
      dispute.priority ??
      (status === 'OPEN'
        ? 'high'
        : status === 'UNDER_REVIEW'
          ? 'medium'
          : 'low'),
    requestedAmount: dispute.requestedAmount,
    resolution: dispute.resolution,
    evidenceCount: dispute.evidence?.length ?? 0,
    commentCount: dispute.comments?.length ?? 0,
    createdAt: dispute.createdAt ?? new Date().toISOString(),
    updatedAt:
      dispute.updatedAt ?? dispute.createdAt ?? new Date().toISOString(),
  };
}

function matchesFilter(
  dispute: AdminDisputeRecord,
  filters: AdminDisputeFilters,
): boolean {
  const normalizedSearch = filters.search?.trim().toLowerCase();

  if (
    filters.status &&
    filters.status !== 'ALL' &&
    dispute.status !== filters.status
  ) {
    return false;
  }

  if (!normalizedSearch) {
    return true;
  }

  return [
    dispute.disputeId,
    dispute.agreementReference,
    dispute.propertyName,
    dispute.raisedByName,
    dispute.againstName,
    dispute.disputeType,
    dispute.description,
  ]
    .join(' ')
    .toLowerCase()
    .includes(normalizedSearch);
}

export function useAdminDisputes(filters: AdminDisputeFilters = {}) {
  return useQuery({
    queryKey: [...ADMIN_DISPUTES_QUERY_KEY, filters],
    queryFn: async () => {
      try {
        const { data } = await apiClient.get<DisputesResponse>('/disputes');
        const rows = (data.disputes ?? data.data ?? []).map(normalizeDispute);
        return rows.length > 0 ? rows : mockDisputes;
      } catch {
        return mockDisputes;
      }
    },
    select: (rows) => rows.filter((row) => matchesFilter(row, filters)),
  });
}

export function useUpdateAdminDisputeStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      disputeId,
      status,
      resolution,
    }: {
      disputeId: string;
      status: AdminDisputeStatus;
      resolution?: string;
    }) => {
      try {
        await apiClient.patch(`/admin/disputes/${disputeId}`, {
          status,
          resolution,
        });
      } catch {
        return { localOnly: true };
      }

      return { localOnly: false };
    },
    onMutate: async ({ disputeId, status, resolution }) => {
      await queryClient.cancelQueries({ queryKey: ADMIN_DISPUTES_QUERY_KEY });

      const snapshots = queryClient.getQueriesData<AdminDisputeRecord[]>({
        queryKey: ADMIN_DISPUTES_QUERY_KEY,
      });

      for (const [queryKey, records] of snapshots) {
        if (!records) continue;

        queryClient.setQueryData<AdminDisputeRecord[]>(queryKey, () =>
          records.map((record) =>
            record.id === disputeId
              ? {
                  ...record,
                  status,
                  resolution: resolution ?? record.resolution,
                  updatedAt: new Date().toISOString(),
                }
              : record,
          ),
        );
      }

      return { snapshots };
    },
    onError: (_error, _variables, context) => {
      for (const [queryKey, records] of context?.snapshots ?? []) {
        queryClient.setQueryData(queryKey, records);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_DISPUTES_QUERY_KEY });
    },
  });
}
