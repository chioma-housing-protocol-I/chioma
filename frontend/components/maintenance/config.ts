import {
  IssueCategory,
  MaintenancePropertyOption,
  PriorityLevel,
  RequestStatus,
} from './types';

export const ISSUE_CATEGORIES: IssueCategory[] = [
  'Plumbing',
  'Electrical',
  'Structural',
  'HVAC',
  'Appliance',
  'Security',
  'Other',
];

export const PRIORITY_LEVELS: PriorityLevel[] = [
  'emergency',
  'urgent',
  'normal',
  'low',
];

export const STATUS_OPTIONS: RequestStatus[] = [
  'open',
  'in_progress',
  'resolved',
  'closed',
];

export const DEFAULT_PROPERTIES: MaintenancePropertyOption[] = [
  { id: 'prop-1', name: 'Sunset View Apartments' },
  { id: 'prop-2', name: 'Pine Tree Townhouse' },
  { id: 'prop-3', name: 'Cityline Studios' },
];

export const PRIORITY_STYLES: Record<PriorityLevel, string> = {
  emergency: 'bg-red-100 text-red-700 border-red-200',
  urgent: 'bg-orange-100 text-orange-700 border-orange-200',
  normal: 'bg-blue-100 text-blue-700 border-blue-200',
  low: 'bg-gray-100 text-gray-700 border-gray-200',
};

export const STATUS_STYLES: Record<RequestStatus, string> = {
  open: 'bg-red-100 text-red-700 border-red-200',
  in_progress: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  resolved: 'bg-green-100 text-green-700 border-green-200',
  closed: 'bg-gray-100 text-gray-700 border-gray-200',
};

export const STATUS_LABELS: Record<RequestStatus, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  closed: 'Closed',
};

export const PRIORITY_LABELS: Record<PriorityLevel, string> = {
  emergency: 'Emergency',
  urgent: 'Urgent',
  normal: 'Normal',
  low: 'Low',
};
