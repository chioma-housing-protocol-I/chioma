'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/store/authStore';
import { apiClient } from '@/lib/api-client';
import type {
  ChatRoom,
  Message,
  SendMessagePayload,
  TypingPayload,
} from './types';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface UseMessagingReturn {
  rooms: ChatRoom[];
  activeRoom: ChatRoom | null;
  messages: Message[];
  typingUsers: Set<string>;
  isConnected: boolean;
  isLoadingRooms: boolean;
  isLoadingMessages: boolean;
  selectRoom: (room: ChatRoom) => void;
  sendMessage: (content: string) => void;
  sendTyping: (isTyping: boolean) => void;
}

export function useMessaging(): UseMessagingReturn {
  const { accessToken, user } = useAuthStore();
  const socketRef = useRef<Socket | null>(null);

  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [activeRoom, setActiveRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [isConnected, setIsConnected] = useState(false);
  const [isLoadingRooms, setIsLoadingRooms] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  const markRoomAsRead = useCallback(async (roomId: string) => {
    setRooms((prev: ChatRoom[]) =>
      prev.map((room: ChatRoom) =>
        room.id === roomId ? { ...room, unreadCount: 0 } : room,
      ),
    );

    try {
      await apiClient.patch(`/messaging/rooms/${roomId}/read`);
    } catch {
      // Server support may not exist yet; local clear still improves UX.
    }
  }, []);

  // ── Fetch rooms on mount ────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;

    const fetchRooms = async () => {
      setIsLoadingRooms(true);

      try {
        const { data } = await apiClient.get<ChatRoom[]>('/messaging/rooms');
        setRooms(data ?? []);
      } catch {
        // Silently fail — show empty state
        setRooms([]);
      } finally {
        setIsLoadingRooms(false);
      }
    };

    fetchRooms();
  }, [user]);

  // ── Socket.io connection ────────────────────────────────────────────────
  useEffect(() => {
    if (!accessToken || !user) return;

    const socket = io(SOCKET_URL, {
      auth: { token: accessToken },
      transports: ['websocket'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));

    // New message from server
    socket.on('message', (message: Message) => {
      setMessages((prev: Message[]) => {
        if (prev.some((m: Message) => m.id === message.id)) return prev;
        return [...prev, message];
      });

      setRooms((prev: ChatRoom[]) =>
        prev.map((r: ChatRoom) =>
          r.id === message.roomId ? { ...r, lastMessage: message } : r,
        ),
      );
    });

    // Typing indicator
    socket.on('typing', ({ userId, isTyping }: TypingPayload) => {
      if (userId === user.id) return;

      setTypingUsers((prev: Set<string>) => {
        const next = new Set(prev);
        if (isTyping) next.add(userId);
        else next.delete(userId);
        return next;
      });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    };
  }, [accessToken, user]);

  // ── Select a room ───────────────────────────────────────────────────────
  const selectRoom = useCallback(
    (room: ChatRoom) => {
      setActiveRoom(room);
      setMessages([]);
      setTypingUsers(new Set());
      setIsLoadingMessages(true);

      if (socketRef.current && activeRoom) {
        socketRef.current.emit('leaveRoom', { roomId: activeRoom.id });
      }

      if (socketRef.current) {
        socketRef.current.emit('joinRoom', { roomId: room.id });
      }

      const fetchMessages = async () => {
        try {
          const { data } = await apiClient.get<Message[]>(
            `/messaging/rooms/${room.id}/messages`,
          );
          setMessages(data ?? []);
        } catch {
          setMessages([]);
        } finally {
          setIsLoadingMessages(false);
        }
      };

      fetchMessages();
      markRoomAsRead(room.id).catch(() => undefined);
    },
    [activeRoom, markRoomAsRead],
  );

  // ── Send a message ──────────────────────────────────────────────────────
  const sendMessage = useCallback(
    (content: string) => {
      if (!activeRoom || !content.trim() || !socketRef.current) return;

      const payload: SendMessagePayload = {
        roomId: activeRoom.id,
        content: content.trim(),
      };

      socketRef.current.emit('sendMessage', payload);
    },
    [activeRoom],
  );

  // ── Typing indicator ────────────────────────────────────────────────────
  const sendTyping = useCallback(
    (isTyping: boolean) => {
      if (!activeRoom || !user || !socketRef.current) return;

      const payload: TypingPayload = {
        roomId: activeRoom.id,
        userId: user.id,
        isTyping,
      };

      socketRef.current.emit('typing', payload);
    },
    [activeRoom, user],
  );

  return {
    rooms,
    activeRoom,
    messages,
    typingUsers,
    isConnected,
    isLoadingRooms,
    isLoadingMessages,
    selectRoom,
    sendMessage,
    sendTyping,
  };
}
