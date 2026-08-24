// Mirrors backend messaging entities exactly

export interface ChatParticipant {
  id: string;
  userId: string;
  roomId: string;
  joinedAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: 'user' | 'admin';
  };
}

export interface ChatRoom {
  id: string;
  name: string | null;
  participants: ChatParticipant[];
  messages: Message[];
  createdAt: string;
  updatedAt: string;
  // Derived client-side
  lastMessage?: Message;
  unreadCount?: number;
}

export type MessageStatus = 'pending' | 'sent' | 'failed';

export interface Message {
  id: string;
  content: string;
  senderId: string;
  roomId: string;
  createdAt: string;
  readAt?: string | null;
  sender: {
    id: string;
    firstName: string;
    lastName: string;
    role: 'user' | 'admin';
  };
  // Client-side only: present while a message is optimistically rendered
  // ahead of server acknowledgement, or once it has failed to send.
  status?: MessageStatus;
}

// Socket.io event payloads (matching the backend gateway)
export interface SendMessagePayload {
  roomId: string;
  content: string;
  // Echoed back by the server (if supported) so the client can reconcile
  // the optimistic message with its authoritative record.
  clientId?: string;
}

export interface SendMessageAck {
  message?: Message;
  error?: string;
}

export interface TypingPayload {
  roomId: string;
  userId: string;
  isTyping: boolean;
}

export interface JoinRoomPayload {
  roomId: string;
}
