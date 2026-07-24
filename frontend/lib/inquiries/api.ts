import { apiClient } from '@/lib/api-client';

export type PropertyInquiryStatus = 'pending' | 'viewed';

export interface InquiryPropertySummary {
  id: string;
  title: string;
  address: string | null;
  city: string | null;
  coverImageUrl: string | null;
}

export interface InquiryCounterparty {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
}

export interface InquiryRecord {
  id: string;
  propertyId: string;
  fromUserId: string;
  toUserId: string;
  message: string;
  senderName: string | null;
  senderEmail: string | null;
  senderPhone: string | null;
  status: PropertyInquiryStatus;
  viewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  property: InquiryPropertySummary | null;
  counterparty: InquiryCounterparty | null;
}

export async function listIncomingInquiries(): Promise<InquiryRecord[]> {
  const { data } = await apiClient.get<InquiryRecord[]>('/inquiries/incoming');
  return data;
}

export async function listOutgoingInquiries(): Promise<InquiryRecord[]> {
  const { data } = await apiClient.get<InquiryRecord[]>('/inquiries/outgoing');
  return data;
}

export async function markInquiryViewed(
  inquiryId: string,
): Promise<InquiryRecord> {
  const { data } = await apiClient.patch<InquiryRecord>(
    `/inquiries/${encodeURIComponent(inquiryId)}/viewed`,
  );
  return data;
}
