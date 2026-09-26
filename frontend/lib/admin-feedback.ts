import { apiClient } from '@/lib/api-client';

export type FeedbackStatus = 'new' | 'reviewed' | 'actioned';
export type FeedbackType = 'bug' | 'feature' | 'support' | 'general';

export interface AdminFeedback {
  id: string;
  email: string | null;
  message: string;
  type: FeedbackType;
  status: FeedbackStatus;
  userId: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

export interface AdminFeedbackPage {
  data: AdminFeedback[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export async function loadAdminFeedback(params: {
  page: number;
  limit?: number;
  status?: FeedbackStatus;
}): Promise<AdminFeedbackPage> {
  const query = new URLSearchParams({
    page: String(params.page),
    limit: String(params.limit ?? 20),
  });
  if (params.status) query.set('status', params.status);
  const response = await apiClient.get<AdminFeedbackPage>(
    `/admin/feedback?${query.toString()}`,
  );
  return response.data;
}

export async function updateAdminFeedbackStatus(
  id: string,
  status: FeedbackStatus,
): Promise<AdminFeedback> {
  const response = await apiClient.patch<AdminFeedback>(
    `/admin/feedback/${encodeURIComponent(id)}`,
    { status },
  );
  return response.data;
}
