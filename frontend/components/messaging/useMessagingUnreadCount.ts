'use client';

import { useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { queryKeys } from '@/lib/query/keys';
import type { ChatRoom } from './types';

export function useMessagingUnreadCount() {
  const pathname = usePathname();
  const isViewingMessages = pathname.includes('/messages');

  const { data } = useQuery({
    queryKey: [...queryKeys.notifications.all, 'messaging-unread-count'],
    queryFn: async () => {
      const { data } = await apiClient.get<ChatRoom[]>('/messaging/rooms');
      return data ?? [];
    },
    refetchInterval: 30_000,
    staleTime: 15_000,
    retry: 1,
  });

  return useMemo(() => {
    if (isViewingMessages) {
      return 0;
    }
    return (data ?? []).reduce(
      (sum: number, room: ChatRoom) => sum + (room.unreadCount ?? 0),
      0,
    );
  }, [data, isViewingMessages]);
}
