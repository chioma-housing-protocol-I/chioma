import { apiClient } from '@/lib/api-client';

/** Refund lifecycle for admin review and processing. */
export type AdminRefundStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'REJECTED';

export interface AdminRefundRequestRow {
  id: string;
  refundId: string;
  originalPaymentId: string;
  amount: number;
  currency: string;
  status: AdminRefundStatus;
  requesterName: string;
  requesterEmail: string;
  reasonSummary: string;
  requestedAt: string;
  updatedAt: string;
}

export type AdminRefundHistoryAction =
  | 'created'
  | 'submitted'
  | 'approved'
  | 'rejected'
  | 'processing_started'
  | 'completed';

export interface AdminRefundHistoryEntry {
  id: string;
  action: AdminRefundHistoryAction;
  message: string;
  actorName: string;
  actorRole: string;
  createdAt: string;
}

export interface AdminRefundRequestDetail extends AdminRefundRequestRow {
  reasonDetail: string;
  paymentMethod: string;
  propertyName?: string;
  agreementReference?: string;
  history: AdminRefundHistoryEntry[];
}

const mockRows: AdminRefundRequestRow[] = [
  {
    id: 'rfd-001',
    refundId: 'RFD-2026-014',
    originalPaymentId: 'PAY-9K2M7Q',
    amount: 45000,
    currency: 'USDC',
    status: 'PENDING',
    requesterName: 'Ada Nwosu',
    requesterEmail: 'ada.nwosu@email.com',
    reasonSummary: 'Duplicate rent debit',
    requestedAt: '2026-03-22T11:20:00.000Z',
    updatedAt: '2026-03-22T11:20:00.000Z',
  },
  {
    id: 'rfd-002',
    refundId: 'RFD-2026-011',
    originalPaymentId: 'PAY-8J1L4R',
    amount: 125000,
    currency: 'USDC',
    status: 'APPROVED',
    requesterName: 'Kunle Bello',
    requesterEmail: 'kunle.bello@email.com',
    reasonSummary: 'Service outage — payment taken twice',
    requestedAt: '2026-03-18T09:00:00.000Z',
    updatedAt: '2026-03-19T14:30:00.000Z',
  },
  {
    id: 'rfd-003',
    refundId: 'RFD-2026-009',
    originalPaymentId: 'PAY-7H0K3P',
    amount: 32000,
    currency: 'USDC',
    status: 'PROCESSING',
    requesterName: 'Amina Hassan',
    requesterEmail: 'amina.hassan@email.com',
    reasonSummary: 'Overpayment on maintenance invoice',
    requestedAt: '2026-03-10T16:45:00.000Z',
    updatedAt: '2026-03-21T08:15:00.000Z',
  },
  {
    id: 'rfd-004',
    refundId: 'RFD-2025-882',
    originalPaymentId: 'PAY-6G9J2N',
    amount: 18000,
    currency: 'USDC',
    status: 'COMPLETED',
    requesterName: 'Chidi Okonkwo',
    requesterEmail: 'chidi.okonkwo@email.com',
    reasonSummary: 'Deposit reconciliation — partial credit',
    requestedAt: '2025-12-05T10:00:00.000Z',
    updatedAt: '2025-12-12T15:00:00.000Z',
  },
  {
    id: 'rfd-005',
    refundId: 'RFD-2026-003',
    originalPaymentId: 'PAY-5F8I1M',
    amount: 9500,
    currency: 'USDC',
    status: 'REJECTED',
    requesterName: 'James Adebayo',
    requesterEmail: 'james.adebayo@email.com',
    reasonSummary: 'Requested refund outside policy window',
    requestedAt: '2026-02-28T13:00:00.000Z',
    updatedAt: '2026-03-01T09:30:00.000Z',
  },
];

const detailMocks: Record<string, AdminRefundRequestDetail> = {
  'rfd-001': {
    ...mockRows[0],
    reasonDetail:
      'Tenant reports that rent for March was debited twice: once via scheduled Stellar transfer and once after a manual reconciliation entry. Bank statement excerpts are attached in the payment dispute log.',
    paymentMethod: 'Stellar (USDC)',
    propertyName: 'Glover Road, Ikoyi',
    agreementReference: 'AGR-2025-021',
    history: [
      {
        id: 'h1',
        action: 'created',
        message: 'Refund request created from tenant dashboard.',
        actorName: 'Ada Nwosu',
        actorRole: 'user',
        createdAt: '2026-03-22T11:20:00.000Z',
      },
    ],
  },
  'rfd-002': {
    ...mockRows[1],
    reasonDetail:
      'During platform maintenance window, checkout retried and captured a second payment for the same invoice reference.',
    paymentMethod: 'Bank transfer',
    propertyName: 'Admiralty Way, Block 4',
    agreementReference: 'AGR-2025-010',
    history: [
      {
        id: 'h2a',
        action: 'created',
        message: 'Request submitted.',
        actorName: 'Kunle Bello',
        actorRole: 'user',
        createdAt: '2026-03-18T09:00:00.000Z',
      },
      {
        id: 'h2b',
        action: 'approved',
        message:
          'Duplicate capture confirmed against ledger. Proceed to payout queue.',
        actorName: 'Finance Ops',
        actorRole: 'admin',
        createdAt: '2026-03-19T14:30:00.000Z',
      },
    ],
  },
  'rfd-003': {
    ...mockRows[2],
    reasonDetail:
      'Invoice total was updated after payment; tenant paid full old amount.',
    paymentMethod: 'Stellar (USDC)',
    propertyName: 'Sunset Apartments, Unit 4B',
    agreementReference: 'AGR-2025-014',
    history: [
      {
        id: 'h3a',
        action: 'created',
        message: 'Request submitted.',
        actorName: 'Amina Hassan',
        actorRole: 'user',
        createdAt: '2026-03-10T16:45:00.000Z',
      },
      {
        id: 'h3b',
        action: 'approved',
        message: 'Approved for refund pipeline.',
        actorName: 'Admin',
        actorRole: 'admin',
        createdAt: '2026-03-20T10:00:00.000Z',
      },
      {
        id: 'h3c',
        action: 'processing_started',
        message: 'Payout batch #2026-03-B scheduled.',
        actorName: 'System',
        actorRole: 'system',
        createdAt: '2026-03-21T08:15:00.000Z',
      },
    ],
  },
  'rfd-004': {
    ...mockRows[3],
    reasonDetail: 'Agreed partial credit after deposit statement review.',
    paymentMethod: 'Stellar (USDC)',
    propertyName: 'Lekki Phase 1',
    agreementReference: 'AGR-2024-332',
    history: [
      {
        id: 'h4a',
        action: 'created',
        message: 'Request submitted.',
        actorName: 'Chidi Okonkwo',
        actorRole: 'user',
        createdAt: '2025-12-05T10:00:00.000Z',
      },
      {
        id: 'h4b',
        action: 'completed',
        message: 'Refund settled to original payment rail.',
        actorName: 'System',
        actorRole: 'system',
        createdAt: '2025-12-12T15:00:00.000Z',
      },
    ],
  },
  'rfd-005': {
    ...mockRows[4],
    reasonDetail:
      'Tenant requested full rent refund after mid-month move; policy allows pro-rata only within 5 days of payment.',
    paymentMethod: 'Bank transfer',
    propertyName: 'Sunset Apartments, Unit 4B',
    agreementReference: 'AGR-2025-014',
    history: [
      {
        id: 'h5a',
        action: 'created',
        message: 'Request submitted.',
        actorName: 'James Adebayo',
        actorRole: 'user',
        createdAt: '2026-02-28T13:00:00.000Z',
      },
      {
        id: 'h5b',
        action: 'rejected',
        message: 'Outside policy window — pro-rata not applicable.',
        actorName: 'Admin',
        actorRole: 'admin',
        createdAt: '2026-03-01T09:30:00.000Z',
      },
    ],
  },
};

export function statusLabel(status: AdminRefundStatus): string {
  return status.replace(/_/g, ' ');
}

export function filterByStatus(
  rows: AdminRefundRequestRow[],
  filter: AdminRefundStatus | 'ALL',
): AdminRefundRequestRow[] {
  if (filter === 'ALL') return rows;
  return rows.filter((r) => r.status === filter);
}

export async function loadAdminRefundRequests(): Promise<
  AdminRefundRequestRow[]
> {
  try {
    const response = await apiClient.get<
      | AdminRefundRequestRow[]
      | { data?: AdminRefundRequestRow[]; refunds?: AdminRefundRequestRow[] }
    >('/admin/refunds');
    const body = response.data;
    const rows = Array.isArray(body) ? body : (body.data ?? body.refunds ?? []);
    if (rows.length > 0) return rows;
  } catch {
    // fallback
  }
  return [...mockRows];
}

export async function loadAdminRefundRequestDetail(
  id: string,
): Promise<AdminRefundRequestDetail | null> {
  const fallback = detailMocks[id] ?? null;

  try {
    const response = await apiClient.get<{
      data?: AdminRefundRequestDetail;
    }>(`/admin/refunds/${encodeURIComponent(id)}`);
    const payload = response.data?.data;
    if (payload && typeof payload === 'object' && 'refundId' in payload) {
      return fallback
        ? {
            ...fallback,
            ...payload,
            history: payload.history ?? fallback.history,
          }
        : (payload as AdminRefundRequestDetail);
    }
  } catch {
    // use mock
  }

  return fallback;
}

export async function submitAdminRefundDecision(
  refundRequestId: string,
  payload: {
    action: 'approve' | 'reject';
    notes: string;
  },
): Promise<void> {
  try {
    await apiClient.post(
      `/admin/refunds/${encodeURIComponent(refundRequestId)}/decision`,
      {
        action: payload.action,
        notes: payload.notes,
      },
    );
  } catch {
    // offline-friendly
  }
}
