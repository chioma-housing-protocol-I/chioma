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
    role: 'tenant' | 'landlord' | 'agent';
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
    role: 'tenant' | 'landlord' | 'agent';
  };
}

// Socket.io event payloads (matching the backend gateway)
export interface SendMessagePayload {
  roomId: string;
  content: string;
}

export interface TypingPayload {
  roomId: string;
  userId: string;
  isTyping: boolean;
}

export interface JoinRoomPayload {
  roomId: string;
}
