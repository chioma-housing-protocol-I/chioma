// backend/src/types/property.types.ts

import { UUID, ISO8601DateTime, StellarPublicKey } from './common.types';
import { Address } from './user.types';

export type PropertyType =
  'apartment' | 'house' | 'condo' | 'townhouse' | 'studio' | 'commercial';
export type PropertyStatus =
  'draft' | 'active' | 'rented' | 'maintenance' | 'inactive';
export type FurnishingStatus = 'furnished' | 'semi_furnished' | 'unfurnished';
export type ParkingType = 'none' | 'street' | 'garage' | 'covered' | 'open';

export interface Property {
  id: UUID;
  landlordId: UUID;
  agentId?: UUID;

  // Stellar integration
  landlordStellarPubKey?: StellarPublicKey;

  // Basic information
  title: string;
  description: string;
  propertyType: PropertyType;

  // Location
  address: Address;

  // Details
  bedrooms: number;
  bathrooms: number;
  halfBathrooms?: number;
  sqft: number;
  yearBuilt?: number;

  // Features
  furnishingStatus: FurnishingStatus;
  parking: ParkingType;
  parkingSpaces?: number;
  amenities: string[];

  // Financial
  monthlyRent: string;
  currency: string; // ISO 4217 currency code (e.g., 'USD', 'NGN')
  securityDepositMonths: number; // e.g., 1, 2, 3
  securityDepositAmount: string; // Calculated: monthlyRent * securityDepositMonths
  utilitiesIncluded: string[]; // ['water', 'electricity', 'gas', 'internet']

  // Lease terms
  minimumLeaseTerm: number; // in months
  maximumLeaseTerm?: number; // in months
  availableFrom: ISO8601DateTime;

  // Media
  images: PropertyImage[];
  videos: PropertyVideo[];
  documents: PropertyDocument[];
  virtualTourUrl?: string;

  // Status
  status: PropertyStatus;
  featured: boolean;
  verified: boolean;
  verifiedAt?: ISO8601DateTime;

  // Stats
  views: number;
  inquiries: number;
  applications: number;

  // Metadata
  createdAt: ISO8601DateTime;
  updatedAt: ISO8601DateTime;
  publishedAt?: ISO8601DateTime;
}

export interface PropertyImage {
  id: UUID;
  propertyId: UUID;
  url: string;
  thumbnailUrl: string;
  caption?: string;
  displayOrder: number;
  isPrimary: boolean;
  uploadedAt: ISO8601DateTime;
}

export interface PropertyVideo {
  id: UUID;
  propertyId: UUID;
  url: string;
  thumbnailUrl: string;
  duration?: number; // in seconds
  caption?: string;
  uploadedAt: ISO8601DateTime;
}

export interface PropertyDocument {
  id: UUID;
  propertyId: UUID;
  type: 'inspection_report' | 'floor_plan' | 'certificate' | 'other';
  name: string;
  url: string;
  fileSize: number; // in bytes
  mimeType: string;
  uploadedAt: ISO8601DateTime;
}

export interface PropertyFilters {
  propertyType?: PropertyType[];
  minRent?: string;
  maxRent?: string;
  bedrooms?: number[];
  bathrooms?: number[];
  city?: string;
  state?: string;
  country?: string;
  amenities?: string[];
  furnishingStatus?: FurnishingStatus[];
  parking?: ParkingType[];
  availableFrom?: ISO8601DateTime;
  status?: PropertyStatus[];
}
