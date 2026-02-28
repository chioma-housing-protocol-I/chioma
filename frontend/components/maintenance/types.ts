export type IssueCategory =
  | 'Plumbing'
  | 'Electrical'
  | 'Structural'
  | 'HVAC'
  | 'Appliance'
  | 'Security'
  | 'Other';

export type PriorityLevel = 'emergency' | 'urgent' | 'normal' | 'low';

export type RequestStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

export type MaintenanceRole = 'tenant' | 'landlord' | 'agent';

export interface MaintenanceMedia {
  id: string;
  name: string;
  url: string;
  type: string;
}

export interface MaintenanceRequest {
  id: string;
  propertyId: string;
  propertyName: string;
  category: IssueCategory;
  description: string;
  priority: PriorityLevel;
  status: RequestStatus;
  createdAt: string;
  updatedAt: string;
  contractorName?: string;
  scheduledVisit?: string;
  tenantName?: string;
  media: MaintenanceMedia[];
}

export interface MaintenancePropertyOption {
  id: string;
  name: string;
}

export interface SubmitMaintenanceInput {
  propertyId: string;
  category: IssueCategory;
  description: string;
  priority: PriorityLevel;
  files: File[];
}
