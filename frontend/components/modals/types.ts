export interface PropertyDetailData {
  id: string;
  title: string;
  address: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  areaSqft?: number;
  description: string;
  amenities?: string[];
  images?: string[];
  landlordName?: string;
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

export interface PropertyInquiryData {
  propertyId: string;
  propertyTitle: string;
  name: string;
  email: string;
  phone?: string;
  message: string;
}

export interface AgreementViewData {
  agreementId: string;
  propertyTitle: string;
  propertyAddress: string;
  landlordName: string;
  tenantName: string;
  monthlyRent: number;
  securityDeposit: number;
  startDate: string;
  endDate: string;
  pdfUrl?: string;
  status?: 'draft' | 'pending' | 'active' | 'expired' | 'signed';
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

export interface AgreementSigningData {
  agreementId: string;
  signerName: string;
  signature: string;
  acceptedTerms: boolean;
  signedAt?: string;
}
