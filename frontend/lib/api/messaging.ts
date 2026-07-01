import { apiClient } from '../api-client';

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  recipientId: string;
  content: string;
  isRead: boolean;
  deliveryStatus: 'sent' | 'delivered' | 'read';
  createdAt: string;
}

export interface Conversation {
  id: string;
  participantIds: string[];
  lastMessage: Message | null;
  unreadCount: number;
  updatedAt: string;
}

export interface MessagesPage {
  messages: Message[];
  total: number;
  page: number;
  limit: number;
  hasNextPage: boolean;
}

export interface SendMessagePayload {
  conversationId: string;
  recipientId: string;
  content: string;
}

let ws: WebSocket | null = null;

export const messagingApi = {
  sendMessage: async (payload: SendMessagePayload): Promise<Message> => {
    const response = await apiClient.post<Message>('/messages', payload);
    return response.data;
  },

  getMessages: async (
    conversationId: string,
    page = 1,
    limit = 20,
  ): Promise<MessagesPage> => {
    const response = await apiClient.get<MessagesPage>(
      `/messages/${encodeURIComponent(conversationId)}?page=${page}&limit=${limit}`,
    );
    return response.data;
  },

  markAsRead: async (messageId: string): Promise<void> => {
    await apiClient.patch(`/messages/${encodeURIComponent(messageId)}/read`);
  },

  deleteMessage: async (messageId: string): Promise<void> => {
    await apiClient.delete(`/messages/${encodeURIComponent(messageId)}`);
  },

  getConversations: async (): Promise<Conversation[]> => {
    const response = await apiClient.get<Conversation[]>('/conversations');
    return response.data;
  },

  connectRealtime: (
    onMessage: (msg: Message) => void,
    onError?: (err: Event) => void,
  ): (() => void) => {
    if (typeof window === 'undefined') return () => {};

    const wsUrl =
      process.env.NEXT_PUBLIC_WS_URL ?? 'ws://localhost:5000/ws/messages';

    ws = new WebSocket(wsUrl);

    ws.onmessage = (event: MessageEvent) => {
      try {
        const msg = JSON.parse(event.data as string) as Message;
        onMessage(msg);
      } catch {
        // ignore malformed frames
      }
    };

    if (onError) ws.onerror = onError;

    return () => {
      ws?.close();
      ws = null;
    };
  },
};
