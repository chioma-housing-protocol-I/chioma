import { apiClient } from '@/lib/api-client';
import type { DisputeStatus, DisputeType } from '@/lib/dashboard-data';

export interface DisputeFilters {
  status?: DisputeStatus | 'ALL';
  search?: string;
  page?: number;
  limit?: number;
}

export interface DisputeListItem {
  id: string;
  backendDisputeId: string;
  disputeId: string;
  agreementReference: string;
  propertyName: string;
  disputeType: DisputeType;
  description: string;
  status: DisputeStatus;
  requestedAmount?: number;
  createdAt: string;
  updatedAt: string;
  evidenceCount: number;
  commentCount: number;
}

export interface DisputeDetailRecord {
  id: string;
  backendDisputeId: string;
  disputeId: string;
  agreementId: string;
  agreementReference: string;
  propertyName: string;
  raisedBy: { name: string; role: string };
  against: { name: string; role: string };
  disputeType: DisputeType;
  description: string;
  status: DisputeStatus;
  requestedAmount?: number;
  resolution?: string;
  createdAt: string;
  updatedAt: string;
  evidence: Array<{
    id: string;
    filename: string;
    fileUrl?: string;
    uploadedAt: string;
  }>;
  comments: Array<{
    id: string;
    author: { name: string; role: string };
    content: string;
    createdAt: string;
  }>;
}

export interface CreateDisputeInput {
  agreementId: string;
  disputeType: DisputeType;
  description: string;
  requestedAmount?: number;
  evidenceFiles?: File[];
  evidenceDescription?: string;
}

interface ApiDisputeParty {
  id?: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string;
  role?: string;
}

interface ApiAgreement {
  id?: string | number;
  agreementNumber?: string | null;
  propertyId?: string | null;
  adminId?: string | null;
  userId?: string | null;
}

interface ApiDisputeEvidence {
  id?: string | number;
  fileName?: string;
  fileUrl?: string;
  createdAt?: string;
}

interface ApiDisputeComment {
  id?: string | number;
  content?: string;
  createdAt?: string;
  user?: ApiDisputeParty;
}

interface ApiDisputeRecord {
  id: string | number;
  disputeId?: string;
  agreementId?: string | number;
  agreement?: ApiAgreement;
  initiator?: ApiDisputeParty;
  resolver?: ApiDisputeParty;
  disputeType?: DisputeType;
  description?: string;
  status?: DisputeStatus;
  requestedAmount?: number;
  resolution?: string;
  createdAt?: string;
  updatedAt?: string;
  evidence?: ApiDisputeEvidence[];
  comments?: ApiDisputeComment[];
}

interface DisputesResponse {
  disputes?: ApiDisputeRecord[];
  total?: number;
  data?: ApiDisputeRecord[] | ApiDisputeRecord;
}

function normalizeRole(role?: string): string {
  return role?.toLowerCase() || 'user';
}

function formatPersonName(party?: ApiDisputeParty, fallback = 'Unknown user') {
  if (!party) return fallback;

  const fullName = [party.firstName, party.lastName].filter(Boolean).join(' ');
  return fullName || party.email || fallback;
}

function formatDisputeReference(rawId?: string) {
  if (!rawId) return 'DSP-UNKNOWN';

  const trimmed = rawId.trim();
  if (trimmed.toUpperCase().startsWith('DSP-')) {
    return trimmed.toUpperCase();
  }

  const compact = trimmed
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, 8)
    .toUpperCase();
  return `DSP-${compact || 'UNKNOWN'}`;
}

function normalizeAmount(amount?: number) {
  return typeof amount === 'number' && Number.isFinite(amount)
    ? amount
    : undefined;
}

function normalizeListItem(dispute: ApiDisputeRecord): DisputeListItem {
  const backendDisputeId = dispute.disputeId || String(dispute.id);
  const agreementReference =
    dispute.agreement?.agreementNumber ||
    String(dispute.agreementId ?? dispute.agreement?.id ?? '');

  return {
    id: String(dispute.id),
    backendDisputeId,
    disputeId: formatDisputeReference(backendDisputeId),
    agreementReference,
    propertyName: agreementReference
      ? `Agreement ${agreementReference}`
      : 'Linked rental agreement',
    disputeType: dispute.disputeType || 'OTHER',
    description: dispute.description || '',
    status: dispute.status || 'OPEN',
    requestedAmount: normalizeAmount(dispute.requestedAmount),
    createdAt: dispute.createdAt || new Date().toISOString(),
    updatedAt:
      dispute.updatedAt || dispute.createdAt || new Date().toISOString(),
    evidenceCount: dispute.evidence?.length ?? 0,
    commentCount: dispute.comments?.length ?? 0,
  };
}

function normalizeDetail(dispute: ApiDisputeRecord): DisputeDetailRecord {
  const normalized = normalizeListItem(dispute);
  const initiatorName = formatPersonName(dispute.initiator, 'Reporter');
  const resolverName = formatPersonName(dispute.resolver, 'Counterparty');

  return {
    ...normalized,
    agreementId: String(dispute.agreementId ?? dispute.agreement?.id ?? ''),
    raisedBy: {
      name: initiatorName,
      role: normalizeRole(dispute.initiator?.role),
    },
    against: {
      name: resolverName === initiatorName ? 'Counterparty' : resolverName,
      role: normalizeRole(dispute.resolver?.role),
    },
    resolution: dispute.resolution,
    evidence: (dispute.evidence || []).map((evidence, index) => ({
      id: String(evidence.id ?? `evidence-${index}`),
      filename: evidence.fileName || 'Uploaded evidence',
      fileUrl: evidence.fileUrl,
      uploadedAt: evidence.createdAt || new Date().toISOString(),
    })),
    comments: (dispute.comments || []).map((comment, index) => ({
      id: String(comment.id ?? `comment-${index}`),
      author: {
        name: formatPersonName(comment.user, 'Anonymous'),
        role: normalizeRole(comment.user?.role),
      },
      content: comment.content || '',
      createdAt: comment.createdAt || new Date().toISOString(),
    })),
  };
}

function matchesSearch(dispute: DisputeListItem, search?: string) {
  const normalizedSearch = search?.trim().toLowerCase();

  if (!normalizedSearch) {
    return true;
  }

  return [
    dispute.disputeId,
    dispute.agreementReference,
    dispute.propertyName,
    dispute.description,
    dispute.disputeType,
  ]
    .join(' ')
    .toLowerCase()
    .includes(normalizedSearch);
}

async function postEvidenceFile(
  disputeId: string,
  file: File,
  description?: string,
) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('fileName', file.name);
  formData.append('fileType', file.type || 'application/octet-stream');

  if (description) {
    formData.append('description', description);
  }

  await apiClient.post(
    `/disputes/${encodeURIComponent(disputeId)}/evidence`,
    formData,
  );
}

export async function listTenantDisputes(
  filters: DisputeFilters = {},
  initiatedBy?: string,
): Promise<DisputeListItem[]> {
  const params = new URLSearchParams({
    page: String(filters.page ?? 1),
    limit: String(filters.limit ?? 20),
    sortBy: 'createdAt',
    sortOrder: 'DESC',
  });

  if (filters.status && filters.status !== 'ALL') {
    params.set('status', filters.status);
  }

  if (initiatedBy) {
    params.set('initiatedBy', initiatedBy);
  }

  const { data } = await apiClient.get<DisputesResponse>(`/disputes?${params}`);
  const rows = (data.disputes || (Array.isArray(data.data) ? data.data : []))
    .map(normalizeListItem)
    .filter((dispute) => matchesSearch(dispute, filters.search));

  return rows;
}

export async function getTenantDispute(
  idOrDisputeId: string,
): Promise<DisputeDetailRecord> {
  const endpoint = /^\d+$/.test(idOrDisputeId)
    ? `/disputes/${idOrDisputeId}`
    : `/disputes/dispute/${encodeURIComponent(idOrDisputeId)}`;

  const { data } = await apiClient.get<DisputesResponse>(endpoint);
  const payload = Array.isArray(data.data) ? data.data[0] : data.data;
  const dispute =
    payload && typeof payload === 'object' && 'id' in payload
      ? (payload as ApiDisputeRecord)
      : (data as unknown as ApiDisputeRecord);

  return normalizeDetail(dispute);
}

export async function createDispute(
  input: CreateDisputeInput,
): Promise<DisputeDetailRecord> {
  const { evidenceFiles = [], evidenceDescription, ...payload } = input;
  const { data } = await apiClient.post<ApiDisputeRecord>('/disputes', payload);
  const created = normalizeDetail(data);

  if (evidenceFiles.length > 0) {
    for (const file of evidenceFiles) {
      await postEvidenceFile(
        created.backendDisputeId,
        file,
        evidenceDescription,
      );
    }

    return getTenantDispute(created.id);
  }

  return created;
}

export async function uploadDisputeEvidence(
  disputeId: string,
  files: File[],
  description?: string,
) {
  for (const file of files) {
    await postEvidenceFile(disputeId, file, description);
  }
}

export async function addDisputeComment(
  disputeId: string,
  content: string,
): Promise<void> {
  await apiClient.post(`/disputes/${encodeURIComponent(disputeId)}/comment`, {
    content,
  });
}

export async function appealDispute(disputeId: string): Promise<void> {
  await apiClient.put(`/disputes/${disputeId}`, { status: 'OPEN' });
}
