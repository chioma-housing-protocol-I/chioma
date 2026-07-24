import { ISSUE_CATEGORIES, PRIORITY_LEVELS, STATUS_OPTIONS } from './config';
import {
  IssueCategory,
  MaintenanceRequest,
  PriorityLevel,
  RequestStatus,
  SubmitMaintenanceInput,
} from './types';

interface MaintenanceApiMedia {
  id?: string | number;
  name?: string;
  url?: string;
  type?: string;
}

export interface MaintenanceApiRequest {
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

export const mapIncomingRequest = (
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

/** Loads all maintenance requests visible to the current user, newest first. */
export async function fetchMaintenanceRequests(): Promise<
  MaintenanceRequest[]
> {
  const response = await fetch('/api/maintenance', { cache: 'no-store' });
  if (!response.ok) throw new Error('Failed to load maintenance requests.');

  const payload = await response.json();
  const rawItems = Array.isArray(payload) ? payload : (payload.data ?? []);
  return (rawItems as MaintenanceApiRequest[])
    .map(mapIncomingRequest)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
}

/** Applies a partial update (e.g. status change) and returns the updated record. */
export async function updateMaintenanceRequest(
  id: string,
  patch: Partial<MaintenanceRequest>,
): Promise<MaintenanceRequest> {
  const response = await fetch(`/api/maintenance/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });

  if (!response.ok) throw new Error('Failed to update maintenance request.');
  return mapIncomingRequest(await response.json());
}

/** Submits a new maintenance request and returns the created record. */
export async function submitMaintenanceRequest(
  input: SubmitMaintenanceInput,
): Promise<MaintenanceRequest> {
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

  if (!response.ok) throw new Error('Failed to submit maintenance request.');
  return mapIncomingRequest(await response.json());
}
