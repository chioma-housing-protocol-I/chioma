'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import {
  listIncomingInquiries,
  listOutgoingInquiries,
  markInquiryViewed,
  type InquiryRecord,
} from '@/lib/inquiries/api';

export type { InquiryRecord };

const INCOMING_INQUIRIES_QUERY_KEY = ['incoming-inquiries'] as const;
const OUTGOING_INQUIRIES_QUERY_KEY = ['outgoing-inquiries'] as const;

export function useIncomingInquiries() {
  const userId = useAuthStore((state) => state.user?.id);

  return useQuery({
    queryKey: [...INCOMING_INQUIRIES_QUERY_KEY, userId],
    enabled: Boolean(userId),
    queryFn: listIncomingInquiries,
    staleTime: 5_000,
  });
}

export function useOutgoingInquiries() {
  const userId = useAuthStore((state) => state.user?.id);

  return useQuery({
    queryKey: [...OUTGOING_INQUIRIES_QUERY_KEY, userId],
    enabled: Boolean(userId),
    queryFn: listOutgoingInquiries,
    staleTime: 5_000,
  });
}

export function useMarkInquiryViewed() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (inquiryId: string) => markInquiryViewed(inquiryId),
    onSuccess: (updated) => {
      queryClient.setQueriesData<InquiryRecord[]>(
        { queryKey: INCOMING_INQUIRIES_QUERY_KEY },
        (records) =>
          records?.map((record) =>
            record.id === updated.id ? updated : record,
          ),
      );
    },
  });
}
