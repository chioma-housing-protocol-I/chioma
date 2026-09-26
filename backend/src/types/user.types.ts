// backend/src/types/user.types.ts

import { UUID, ISO8601DateTime, StellarPublicKey } from './common.types';

export type UserRole = 'admin' | 'user' | 'agent' | 'super_admin';
export type UserStatus = 'pending' | 'active' | 'suspended' | 'deactivated';
export type KYCStatus = 'not_started' | 'pending' | 'approved' | 'rejected';

export interface User {
  id: UUID;
  email: string;
  passwordHash: string;
  role: UserRole;
  status: UserStatus;

  // Stellar integration
  stellarPublicKey?: StellarPublicKey;
  stellarAccountCreated: boolean;

  // Profile
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  profileImageUrl?: string;

  // Verification
  emailVerified: boolean;
  phoneVerified: boolean;
  kycStatus: KYCStatus;

  // Metadata
  createdAt: ISO8601DateTime;
  updatedAt: ISO8601DateTime;
  lastLoginAt?: ISO8601DateTime;
}

export interface AdminProfile {
  id: UUID;
  userId: UUID;

  // Business information
  companyName?: string;
  businessRegistrationNumber?: string;
  taxId?: string;

  // Contact
  businessAddress?: Address;
  businessPhoneNumber?: string;
  businessEmail?: string;

  // Stats
  totalProperties: number;
  activeRentals: number;
  averageRating?: number;
  totalReviews: number;

  // Verification
  verified: boolean;
  verifiedAt?: ISO8601DateTime;

  createdAt: ISO8601DateTime;
  updatedAt: ISO8601DateTime;
}

export interface UserProfile {
  id: UUID;
  userId: UUID;

  // Employment
  employmentStatus?:
    'employed' | 'self_employed' | 'unemployed' | 'student' | 'retired';
  employer?: string;
  monthlyIncome?: string;

  // Rental history
  previousAddress?: Address;
  yearsOfRentalHistory?: number;

  // References
  references: UserReference[];

  // Stats
  activeLeases: number;
  totalLeasesCompleted: number;
  averageRating?: number;

  createdAt: ISO8601DateTime;
  updatedAt: ISO8601DateTime;
}

export interface AgentProfile {
  id: UUID;
  userId: UUID;

  // Business
  agencyName?: string;
  licenseNumber?: string;
  licenseExpiry?: ISO8601DateTime;

  // Service area
  serviceAreas: string[]; // Array of city/region names
  specializations: string[]; // Using string[] as PropertyType is not defined in provided types

  // Commission
  defaultCommissionRate: number; // Percentage (e.g., 10.5 for 10.5%)

  // Stats
  totalDeals: number;
  activeListings: number;
  averageRating?: number;
  totalReviews: number;

  // Verification
  verified: boolean;
  verifiedAt?: ISO8601DateTime;

  createdAt: ISO8601DateTime;
  updatedAt: ISO8601DateTime;
}

export interface UserReference {
  id: UUID;
  name: string;
  relationship: 'previous_host' | 'employer' | 'personal';
  email?: string;
  phoneNumber?: string;
  notes?: string;
  verified: boolean;
}

export interface Address {
  street: string;
  unit?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}
