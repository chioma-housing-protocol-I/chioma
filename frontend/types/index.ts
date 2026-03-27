/**
 * Central Type Definitions
 * Matches backend entity structures
 */

// User Types
export interface User {
  id: string;
  email: string;
  name?: string;
  role: 'tenant' | 'landlord' | 'agent' | 'admin';
  phone?: string;
  avatar?: string;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

// User Activity Types
export type ActivityType =
  | 'login'
  | 'property_view'
  | 'system_event'
  | 'profile_update'
  | 'kyc_submission';

export interface UserActivity {
  id: string;
  userId: string;
  type: ActivityType;
  description: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

// Property Types
export interface Property {
  id: string;
  title: string;
  description: string;
  address: string;
  city: string;
  state: string;
  country: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  squareFeet: number;
  propertyType: 'apartment' | 'house' | 'condo' | 'studio';
  status: 'available' | 'rented' | 'maintenance';
  images: PropertyImage[];
  amenities: PropertyAmenity[];
  landlordId: string;
  landlord?: User;
  createdAt: string;
  updatedAt: string;
}

export interface PropertyImage {
  id: string;
  url: string;
  isPrimary: boolean;
  order: number;
}

export interface PropertyAmenity {
  id: string;
  name: string;
  icon?: string;
}

// Agreement Types
export interface RentalAgreement {
  id: string;
  propertyId: string;
  property?: Property;
  tenantId: string;
  tenant?: User;
  landlordId: string;
  landlord?: User;
  startDate: string;
  endDate: string;
  monthlyRent: number;
  securityDeposit: number;
  status: 'draft' | 'active' | 'expired' | 'terminated';
  terms: string;
  blockchainTxHash?: string;
  createdAt: string;
  updatedAt: string;
}

// Payment Types
export interface Payment {
  id: string;
  agreementId: string;
  agreement?: RentalAgreement;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  paymentMethod: 'card' | 'bank_transfer' | 'crypto';
  transactionId?: string;
  blockchainTxHash?: string;
  dueDate: string;
  paidAt?: string;
  createdAt: string;
}

// Maintenance Types
export interface MaintenanceRequest {
  id: string;
  propertyId: string;
  property?: Property;
  tenantId: string;
  tenant?: User;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  category: string;
  images: string[];
  assignedTo?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// Dispute Types
export interface Dispute {
  id: string;
  agreementId: string;
  agreement?: RentalAgreement;
  raisedBy: string;
  raisedByUser?: User;
  againstId: string;
  againstUser?: User;
  title: string;
  description: string;
  status: 'open' | 'under_review' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high';
  evidence: DisputeEvidence[];
  resolution?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DisputeEvidence {
  id: string;
  type: 'document' | 'image' | 'video';
  url: string;
  description?: string;
  uploadedAt: string;
}

// Audit Types
export interface AuditLog {
  id: number;
  performedBy?: string;
  user?: User;
  action: string;
  entityType?: string;
  entityId?: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  status?: 'SUCCESS' | 'FAILURE';
  level?: 'INFO' | 'WARN' | 'ERROR' | 'SECURITY';
  ipAddress?: string;
  userAgent?: string;
  performedAt: string;
}

// Transaction Types
export interface Transaction {
  id: string;
  type: 'payment' | 'refund' | 'deposit' | 'withdrawal';
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed';
  fromUserId?: string;
  toUserId?: string;
  description: string;
  metadata?: Record<string, unknown>;
  blockchainTxHash?: string;
  createdAt: string;
}

export type AnchorTransactionType = 'deposit' | 'withdrawal';
export type AnchorTransactionStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'refunded';

export interface AnchorTransaction {
  id: string;
  anchorTransactionId?: string | null;
  type: AnchorTransactionType;
  status: AnchorTransactionStatus;
  amount: number | string;
  currency: string;
  walletAddress: string;
  paymentMethod?: string | null;
  destination?: string | null;
  stellarTransactionId?: string | null;
  memo?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface AnchorTransactionStats {
  total: number;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  refunded: number;
  verified: number;
  averageTimeToAnchorSeconds: number;
}

export interface AgentTransaction {
  transactionId: string;
  agentAddress: string;
  parties: string[];
  completed: boolean;
  blockchainHash: string | null;
  createdAt: string;
  updatedAt: string;
}

// KYC Types (Admin)
export type KycStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'NEEDS_INFO';

export interface KycDocument {
  id: string;
  type: string;
  url: string;
  filename?: string;
}

export interface KycVerification {
  id: string;
  userId: string;
  status: KycStatus;
  reason?: string;
  providerReference?: string;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    name?: string;
    email: string;
    phone?: string;
    role?: User['role'];
  };
  kycData?: {
    first_name?: string;
    last_name?: string;
    dob?: string;
    country?: string;
    [key: string]: unknown;
  };
  documents?: KycDocument[];
}

// RBAC Types (Admin)
export interface Permission {
  id: string;
  name: string;
  description?: string | null;
  resource: string;
  action: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Role {
  id: string;
  name: string;
  description?: string | null;
  systemRole?: string | null;
  isActive: boolean;
  permissions: Permission[];
  createdAt: string;
  updatedAt: string;
}

// API Response Types
export interface ApiResponse<T> {
  data: T;
  status: number;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiError {
  message: string;
  statusCode: number;
  error?: string;
}

// Document Types
export type DocumentType = 'pdf' | 'image' | 'docx' | 'xlsx' | 'txt';
export type DocumentCategory =
  | 'lease'
  | 'identity'
  | 'payment'
  | 'maintenance'
  | 'inspection'
  | 'other';

export interface Document {
  id: string;
  name: string;
  type: DocumentType;
  url: string;
  size: number;
  uploadedBy: string;
  uploadedByName?: string;
  uploadedAt: string;
  category?: DocumentCategory;
  description?: string;
  thumbnailUrl?: string;
}
