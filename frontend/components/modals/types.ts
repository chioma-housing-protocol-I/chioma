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
}

export interface AgreementSigningData {
  agreementId: string;
  signerName: string;
  signature: string;
  acceptedTerms: boolean;
  signedAt?: string;
}
