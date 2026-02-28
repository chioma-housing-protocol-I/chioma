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
  id: string;
  userId: string;
  user?: User;
  action: string;
  entity: string;
  entityId: string;
  changes?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
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
