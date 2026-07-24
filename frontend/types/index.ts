/**
 * Central Type Definitions
 * Matches backend entity structures
 */

// Security Types
export * from './security';

// User Types
export interface User {
  id: string;
  email: string;
  name?: string;
  role: 'admin' | 'user';
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

// Property Types — aligned with backend entity (ListingStatus / PropertyType enums)
export type PropertyType =
  'apartment' | 'house' | 'commercial' | 'land' | 'other';
export type ListingStatus = 'draft' | 'published' | 'rented' | 'archived';

export interface Property {
  id: string;
  title: string;
  description: string;
  /** Street address */
  address: string;
  city: string;
  state: string;
  postalCode?: string;
  country: string;
  latitude?: number;
  longitude?: number;
  price: number;
  currency?: string;
  bedrooms: number;
  bathrooms: number;
  /** Area in square metres (backend field name) */
  area: number;
  /** Alias kept for backward compatibility */
  squareFeet?: number;
  floor?: number;
  type: PropertyType;
  /** @deprecated Use `type` — kept for backward compatibility */
  propertyType?: PropertyType;
  status: ListingStatus;
  isFurnished?: boolean;
  hasParking?: boolean;
  petsAllowed?: boolean;
  images: PropertyImage[];
  amenities: PropertyAmenity[];
  /** Owner UUID (backend: ownerId) */
  ownerId: string;
  /** @deprecated Use `ownerId` — kept for backward compatibility */
  landlordId?: string;
  owner?: User;
  /** @deprecated Use `owner` — kept for backward compatibility */
  landlord?: User;
  createdAt: string;
  updatedAt: string;
  viewCount?: number;
  favoriteCount?: number;
  lastViewedAt?: string | null;
  verificationStatus?: string | null;
  virtualTourUrl?: string | null;
  videoUrl?: string | null;
  floorPlanUrl?: string | null;
  energyRating?: string | null;
  petPolicy?: string | null;
  parkingSpaces?: number | null;
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
  renewalOption?: boolean | null;
  renewalNoticeDate?: string | null;
  moveInDate?: string | null;
  moveOutDate?: string | null;
  utilitiesIncluded?: boolean | null;
  maintenanceResponsibility?: string | null;
  earlyTerminationFee?: number | null;
  lateFeePercentage?: number | null;
  gracePeriodDays?: number | null;
}

// Payment Types
export interface Payment {
  id: string;
  agreementId: string;
  agreement?: RentalAgreement;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded' | 'partial_refund';
  paymentMethod: 'card' | 'bank_transfer' | 'crypto';
  transactionId?: string;
  blockchainTxHash?: string;
  dueDate: string;
  paidAt?: string;
  referenceNumber?: string | null;
  refundAmount?: number;
  refundStatus?: string | null;
  refundReason?: string | null;
  receiptUrl?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}

export interface PaymentMethod {
  id: number;
  userId: string;
  paymentType: string;
  lastFour: string;
  expiryDate?: string;
  isDefault: boolean;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
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

// Arbiter Types
export interface Arbiter {
  id: number;
  stellarAddress: string;
  userId?: number | null;
  user?: User | null;
  active: boolean;
  blockchainAddedAt?: number | null;
  transactionHash?: string | null;
  totalVotes: number;
  totalDisputesResolved: number;
  reputationScore: number;
  successfulResolutions: number;
  metadata?: {
    qualifications?: string;
    specialization?: string;
    stakeAmount?: string;
    [key: string]: any;
  } | null;
  createdAt: string;
  updatedAt: string;
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
  'pending' | 'processing' | 'completed' | 'failed' | 'refunded';

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

export type IndexedTransactionStatus =
  'pending' | 'indexed' | 'confirmed' | 'failed';

export type IndexedTransactionBlockchainConfirmation =
  'confirmed' | 'unconfirmed' | 'failed';

export interface IndexedTransaction {
  id: string;
  transactionHash: string;
  ledger: number;
  ledgerCloseTime: string;
  successful: boolean;
  transactionType: string;
  sourceAccount: string;
  destinationAccount?: string | null;
  amount: string;
  assetCode: string;
  assetIssuer?: string | null;
  fee: string;
  memo?: string | null;
  memoType?: 'text' | 'id' | 'hash' | null;
  agreementId?: string | null;
  propertyId?: string | null;
  paymentId?: string | null;
  depositId?: string | null;
  operations: Array<Record<string, unknown>>;
  metadata: Record<string, unknown>;
  indexed: boolean;
  indexedAt?: string | null;
  createdAt: string;
  indexingStatus: IndexedTransactionStatus;
  retryCount: number;
  blockNumber: number;
  blockchainConfirmation: IndexedTransactionBlockchainConfirmation;
  dataIndexed: number;
}

export interface IndexedTransactionStats {
  total: number;
  pending: number;
  indexed: number;
  confirmed: number;
  failed: number;
  averageIndexingTimeSeconds: number;
  successRate: number;
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

// Search Types
export interface SearchFilters {
  query?: string;
  city?: string;
  state?: string;
  country?: string;
  type?: string;
  status?: string;
  minPrice?: number;
  maxPrice?: number;
  bedrooms?: number;
  bathrooms?: number;
  isFurnished?: boolean;
  hasParking?: boolean;
  petsAllowed?: boolean;
  amenities?: string[];
  lat?: number;
  lng?: number;
  radiusKm?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface UserSearchFilters {
  query?: string;
  role?: string;
  isActive?: boolean;
  kycVerified?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface DocumentSearchFilters {
  query?: string;
  status?: string;
  propertyId?: string;
  userId?: string;
  adminId?: string;
  minRent?: number;
  maxRent?: number;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface SearchFacets {
  types: Array<{ type: string; count: number }>;
  cities: Array<{ city: string; count: number }>;
  priceRanges: Array<{
    label: string;
    min: number;
    max: number;
    count: number;
  }>;
  amenities: { furnished: number; parking: number; petsAllowed: number };
}

export interface SearchResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  facets: SearchFacets;
}

export interface SearchSuggestResult {
  suggestions: string[];
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
  'lease' | 'identity' | 'payment' | 'maintenance' | 'inspection' | 'other';

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
