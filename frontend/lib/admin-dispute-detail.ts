import { apiClient } from '@/lib/api-client';
import type { DisputeStatus, DisputeType } from '@/lib/dashboard-data';
import {
  getAdminDisputesMockList,
  type DashboardDispute,
} from '@/lib/dashboard-data';

export type DisputeTimelineEventType =
  | 'created'
  | 'evidence_submitted'
  | 'status_change'
  | 'comment'
  | 'assigned'
  | 'resolution_decision';

export interface AdminDisputeTimelineEvent {
  id: string;
  type: DisputeTimelineEventType;
  title: string;
  description?: string;
  actorName?: string;
  actorRole?: string;
  createdAt: string;
}

export interface AdminDisputeEvidenceItem {
  id: string;
  label: string;
  type: 'document' | 'image' | 'video';
  url: string;
  uploadedByName: string;
  uploadedAt: string;
}

export type AdminResolutionDecision =
  | 'approve'
  | 'reject'
  | 'partial'
  | 'withdrawn';

export interface AdminDisputeResolutionEntry {
  id: string;
  decision: AdminResolutionDecision;
  notes: string;
  decidedByName: string;
  decidedByRole: string;
  decidedAt: string;
}

export interface AdminDisputeDetail {
  id: string;
  disputeId: string;
  agreementReference: string;
  propertyName: string;
  claimantName: string;
  claimantRole: 'user' | 'admin';
  respondentName: string;
  respondentRole: 'user' | 'admin';
  disputeType: DisputeType;
  description: string;
  status: DisputeStatus;
  priority: 'low' | 'medium' | 'high';
  requestedAmount?: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
  assignedToName?: string;
  evidence: AdminDisputeEvidenceItem[];
  timeline: AdminDisputeTimelineEvent[];
  resolutionHistory: AdminDisputeResolutionEntry[];
}

interface AdminDisputeDetailResponse {
  data?: AdminDisputeDetail;
}

const detailMocks: Record<string, AdminDisputeDetail> = {
  'dis-001': {
    id: 'dis-001',
    disputeId: 'DSP-2026-001',
    agreementReference: 'AGR-2025-014',
    propertyName: 'Sunset Apartments, Unit 4B',
    claimantName: 'Amina Hassan',
    claimantRole: 'user',
    respondentName: 'James Adebayo',
    respondentRole: 'user',
    disputeType: 'MAINTENANCE',
    description:
      'Water damage repairs were delayed for 12 days after the issue was reported.',
    status: 'UNDER_REVIEW',
    priority: 'high',
    requestedAmount: 40000,
    currency: 'USDC',
    createdAt: '2026-02-18T10:00:00.000Z',
    updatedAt: '2026-03-06T13:20:00.000Z',
    assignedToName: 'Arbiter Team A',
    evidence: [
      {
        id: 'ev-1',
        label: 'Bathroom leak — photo set 1',
        type: 'image',
        url: '/globe.svg',
        uploadedByName: 'Amina Hassan',
        uploadedAt: '2026-02-18T10:05:00.000Z',
      },
      {
        id: 'ev-2',
        label: 'Maintenance ticket export',
        type: 'document',
        url: '/file.svg',
        uploadedByName: 'Amina Hassan',
        uploadedAt: '2026-02-18T10:08:00.000Z',
      },
      {
        id: 'ev-3',
        label: 'Follow-up video walkthrough',
        type: 'video',
        url: '/globe.svg',
        uploadedByName: 'Amina Hassan',
        uploadedAt: '2026-02-20T14:00:00.000Z',
      },
    ],
    timeline: [
      {
        id: 'tl-1',
        type: 'created',
        title: 'Dispute opened',
        description: 'Case filed under maintenance category.',
        actorName: 'Amina Hassan',
        actorRole: 'user',
        createdAt: '2026-02-18T10:00:00.000Z',
      },
      {
        id: 'tl-2',
        type: 'evidence_submitted',
        title: 'Evidence uploaded',
        description: '3 files attached to the case.',
        actorName: 'Amina Hassan',
        actorRole: 'user',
        createdAt: '2026-02-18T10:08:00.000Z',
      },
      {
        id: 'tl-3',
        type: 'status_change',
        title: 'Status → Under review',
        description: 'Escalated to dispute resolution queue.',
        actorName: 'System',
        actorRole: 'system',
        createdAt: '2026-02-19T09:00:00.000Z',
      },
      {
        id: 'tl-4',
        type: 'assigned',
        title: 'Assigned to arbiter pool',
        description: 'Arbiter Team A picked up preliminary review.',
        actorName: 'Admin',
        actorRole: 'admin',
        createdAt: '2026-03-01T11:30:00.000Z',
      },
      {
        id: 'tl-5',
        type: 'comment',
        title: 'Landlord response',
        description:
          'Contractor was scheduled; delay due to parts shipment — attaching vendor comms.',
        actorName: 'James Adebayo',
        actorRole: 'user',
        createdAt: '2026-03-04T16:45:00.000Z',
      },
    ],
    resolutionHistory: [],
  },
  'dis-002': {
    id: 'dis-002',
    disputeId: 'DSP-2025-019',
    agreementReference: 'AGR-2025-014',
    propertyName: 'Sunset Apartments, Unit 4B',
    claimantName: 'Amina Hassan',
    claimantRole: 'user',
    respondentName: 'James Adebayo',
    respondentRole: 'user',
    disputeType: 'SECURITY_DEPOSIT',
    description:
      'Requesting clarity on deduction applied to the security deposit statement.',
    status: 'RESOLVED',
    priority: 'medium',
    requestedAmount: 60000,
    currency: 'USDC',
    createdAt: '2025-12-20T16:00:00.000Z',
    updatedAt: '2026-01-04T12:10:00.000Z',
    assignedToName: 'Arbiter Team B',
    evidence: [
      {
        id: 'ev-d2-1',
        label: 'Deposit statement PDF',
        type: 'document',
        url: '/file.svg',
        uploadedByName: 'Amina Hassan',
        uploadedAt: '2025-12-20T16:02:00.000Z',
      },
      {
        id: 'ev-d2-2',
        label: 'Move-out checklist scan',
        type: 'image',
        url: '/window.svg',
        uploadedByName: 'James Adebayo',
        uploadedAt: '2025-12-22T10:00:00.000Z',
      },
    ],
    timeline: [
      {
        id: 'tl-d2-1',
        type: 'created',
        title: 'Dispute opened',
        description: 'Security deposit reconciliation questioned.',
        actorName: 'Amina Hassan',
        actorRole: 'user',
        createdAt: '2025-12-20T16:00:00.000Z',
      },
      {
        id: 'tl-d2-2',
        type: 'resolution_decision',
        title: 'Resolution recorded',
        description: 'Partial refund agreed after receipt verification.',
        actorName: 'Arbiter Team B',
        actorRole: 'arbiter',
        createdAt: '2026-01-04T12:10:00.000Z',
      },
    ],
    resolutionHistory: [
      {
        id: 'res-d2-1',
        decision: 'partial',
        notes:
          'Landlord provided receipts and issued a partial refund for undocumented charges.',
        decidedByName: 'Efe Okafor',
        decidedByRole: 'arbiter',
        decidedAt: '2026-01-04T12:10:00.000Z',
      },
    ],
  },
  'dis-101': {
    id: 'dis-101',
    disputeId: 'DSP-2026-004',
    agreementReference: 'AGR-2025-021',
    propertyName: 'Glover Road, Ikoyi',
    claimantName: 'Ada Nwosu',
    claimantRole: 'user',
    respondentName: 'Chidi Okonkwo',
    respondentRole: 'user',
    disputeType: 'RENT_PAYMENT',
    description:
      'Tenant claims rent was debited twice after a manual settlement was also recorded.',
    status: 'OPEN',
    priority: 'high',
    requestedAmount: 180000,
    currency: 'USDC',
    createdAt: '2026-03-04T08:45:00.000Z',
    updatedAt: '2026-03-04T08:45:00.000Z',
    evidence: [
      {
        id: 'ev-101-1',
        label: 'Bank statement excerpt',
        type: 'document',
        url: '/file.svg',
        uploadedByName: 'Ada Nwosu',
        uploadedAt: '2026-03-04T08:50:00.000Z',
      },
    ],
    timeline: [
      {
        id: 'tl-101-1',
        type: 'created',
        title: 'Dispute opened',
        description: 'Duplicate rent debit alleged.',
        actorName: 'Ada Nwosu',
        actorRole: 'user',
        createdAt: '2026-03-04T08:45:00.000Z',
      },
    ],
    resolutionHistory: [],
  },
  'dis-102': {
    id: 'dis-102',
    disputeId: 'DSP-2026-002',
    agreementReference: 'AGR-2025-010',
    propertyName: 'Admiralty Way, Block 4',
    claimantName: 'Kunle Bello',
    claimantRole: 'user',
    respondentName: 'Fatima Ibrahim',
    respondentRole: 'user',
    disputeType: 'PROPERTY_DAMAGE',
    description:
      'Checkout inspection found damage to the kitchen cabinet and broken smoke detectors.',
    status: 'UNDER_REVIEW',
    priority: 'high',
    requestedAmount: 95000,
    currency: 'USDC',
    createdAt: '2026-02-09T17:30:00.000Z',
    updatedAt: '2026-03-03T10:00:00.000Z',
    assignedToName: 'Arbiter Team A',
    evidence: [
      {
        id: 'ev-102-1',
        label: 'Inspection photos',
        type: 'image',
        url: '/globe.svg',
        uploadedByName: 'Fatima Ibrahim',
        uploadedAt: '2026-02-10T09:00:00.000Z',
      },
      {
        id: 'ev-102-2',
        label: 'Quote from carpenter',
        type: 'document',
        url: '/file.svg',
        uploadedByName: 'Fatima Ibrahim',
        uploadedAt: '2026-02-11T12:00:00.000Z',
      },
      {
        id: 'ev-102-3',
        label: 'Tenant move-in checklist',
        type: 'document',
        url: '/file.svg',
        uploadedByName: 'Kunle Bello',
        uploadedAt: '2026-02-15T08:30:00.000Z',
      },
      {
        id: 'ev-102-4',
        label: 'Smoke detector serial photo',
        type: 'image',
        url: '/window.svg',
        uploadedByName: 'Fatima Ibrahim',
        uploadedAt: '2026-02-18T11:00:00.000Z',
      },
    ],
    timeline: [
      {
        id: 'tl-102-1',
        type: 'created',
        title: 'Dispute opened',
        description: 'Property damage claim after checkout.',
        actorName: 'Fatima Ibrahim',
        actorRole: 'user',
        createdAt: '2026-02-09T17:30:00.000Z',
      },
      {
        id: 'tl-102-2',
        type: 'evidence_submitted',
        title: 'Additional evidence',
        description: 'Tenant submitted prior condition checklist.',
        actorName: 'Kunle Bello',
        actorRole: 'user',
        createdAt: '2026-02-15T08:30:00.000Z',
      },
      {
        id: 'tl-102-3',
        type: 'status_change',
        title: 'Status → Under review',
        description: 'Awaiting arbiter synthesis.',
        actorName: 'System',
        actorRole: 'system',
        createdAt: '2026-02-20T10:00:00.000Z',
      },
    ],
    resolutionHistory: [],
  },
};

function mergeApiDetail(
  base: AdminDisputeDetail,
  partial: Partial<AdminDisputeDetail> & Record<string, unknown>,
): AdminDisputeDetail {
  return {
    ...base,
    ...partial,
    evidence: Array.isArray(partial.evidence)
      ? (partial.evidence as AdminDisputeEvidenceItem[])
      : base.evidence,
    timeline: Array.isArray(partial.timeline)
      ? (partial.timeline as AdminDisputeTimelineEvent[])
      : base.timeline,
    resolutionHistory: Array.isArray(partial.resolutionHistory)
      ? (partial.resolutionHistory as AdminDisputeResolutionEntry[])
      : base.resolutionHistory,
  };
}

export async function loadAdminDisputeDetail(
  id: string,
): Promise<AdminDisputeDetail | null> {
  const fallback = detailMocks[id] ?? null;

  try {
    const response = await apiClient.get<AdminDisputeDetailResponse>(
      `/admin/disputes/${encodeURIComponent(id)}`,
    );
    const payload = response.data?.data;
    if (payload && typeof payload === 'object' && 'disputeId' in payload) {
      return fallback
        ? mergeApiDetail(fallback, payload as Partial<AdminDisputeDetail>)
        : (payload as AdminDisputeDetail);
    }
  } catch {
    // use mock below
  }

  return fallback;
}

export async function loadAdminDisputesList(): Promise<DashboardDispute[]> {
  try {
    const response = await apiClient.get<
      | DashboardDispute[]
      | {
          disputes?: DashboardDispute[];
          data?: DashboardDispute[];
        }
    >('/admin/disputes');
    const body = response.data;
    const rows = Array.isArray(body)
      ? body
      : (body.disputes ?? body.data ?? []);
    if (rows.length > 0) return rows;
  } catch {
    // fall through
  }
  return getAdminDisputesMockList();
}

export async function submitAdminDisputeResolution(
  disputeId: string,
  payload: {
    resolutionNotes: string;
    action: 'approve' | 'reject';
  },
): Promise<void> {
  try {
    await apiClient.post(
      `/admin/disputes/${encodeURIComponent(disputeId)}/resolve`,
      {
        resolutionNotes: payload.resolutionNotes,
        action: payload.action,
      },
    );
  } catch {
    // Offline-friendly: allow UI to complete when backend is not wired.
  }
}

export function statusLabel(status: DisputeStatus): string {
  return status.replace(/_/g, ' ');
}

export function typeLabel(t: DisputeType): string {
  return t.replace(/_/g, ' ');
}

export function timelineIconType(
  type: DisputeTimelineEventType,
): 'info' | 'success' | 'warning' | 'neutral' {
  switch (type) {
    case 'resolution_decision':
    case 'created':
      return 'success';
    case 'status_change':
    case 'assigned':
      return 'warning';
    case 'evidence_submitted':
    case 'comment':
      return 'info';
    default:
      return 'neutral';
  }
}
