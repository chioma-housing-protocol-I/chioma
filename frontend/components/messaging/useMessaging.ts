'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/store/authStore';
import { apiClient } from '@/lib/api-client';
import { useOnline } from '@/lib/offline/hooks';
import {
  addToSyncQueue,
  getSyncQueue,
  removeSyncQueueItem,
  type SyncQueueItem,
} from '@/lib/offline/db';
import { logError } from '@/lib/errors/logger';
import type {
  ChatRoom,
  Message,
  SendMessageAck,
  SendMessagePayload,
  TypingPayload,
} from './types';

// Entity name used to identify queued outbound messages in the shared
// offline sync queue store (#1557). Filtered out of the generic REST replay
// in `lib/offline/sync-manager.ts`, since messages are re-dispatched over
// the socket here instead of POSTed to a REST endpoint.
const QUEUED_MESSAGE_ENTITY = 'chat-message';

interface QueuedMessagePayload {
  roomId: string;
  content: string;
  clientId: string;
}

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

// How long an optimistic message may sit as "pending" before we give up
// waiting for a server ack or echo and mark it failed/retryable.
const SEND_TIMEOUT_MS = 10000;

function generateClientId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `c${Date.now()}${Math.random().toString(36).slice(2)}`;
}

interface PendingSend {
  roomId: string;
  content: string;
  attachment?: File;
}

interface UseMessagingReturn {
  rooms: ChatRoom[];
  activeRoom: ChatRoom | null;
  messages: Message[];
  typingUsers: Set<string>;
  isConnected: boolean;
  isLoadingRooms: boolean;
  isLoadingMessages: boolean;
  /**
   * Room IDs whose most recent read-receipt sync failed (#1557). The local
   * unread count is still cleared for responsiveness, but the server was
   * never told, so a caller can surface this rather than silently trusting
   * the local state matches the server's.
   */
  readSyncFailedRoomIds: Set<string>;
  selectRoom: (room: ChatRoom) => void;
  sendMessage: (content: string, attachment?: File) => void;
  retryMessage: (clientId: string) => void;
  sendTyping: (isTyping: boolean) => void;
  createRoom: (participantId: string) => Promise<ChatRoom | null>;
}

export function useMessaging(): UseMessagingReturn {
  const { accessToken, user } = useAuthStore();
  const socketRef = useRef<Socket | null>(null);
  const pendingSendsRef = useRef<Map<string, PendingSend>>(new Map());
  const pendingTimeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );

  const isOnline = useOnline();
  const isOnlineRef = useRef(isOnline);
  useEffect(() => {
    isOnlineRef.current = isOnline;
  }, [isOnline]);

  // Holds the latest `flushQueuedMessages` so the socket `connect` handler
  // (registered in an effect that only depends on [accessToken, user]) can
  // call the current version without needing to re-subscribe the socket
  // every time it changes.
  const flushQueuedMessagesRef = useRef<() => Promise<void>>(async () => {});

  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [activeRoom, setActiveRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [isConnected, setIsConnected] = useState(false);
  const [isLoadingRooms, setIsLoadingRooms] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [readSyncFailedRoomIds, setReadSyncFailedRoomIds] = useState<
    Set<string>
  >(new Set());

  const markRoomAsRead = useCallback(async (roomId: string) => {
    setRooms((prev: ChatRoom[]) =>
      prev.map((room: ChatRoom) =>
        room.id === roomId ? { ...room, unreadCount: 0 } : room,
      ),
    );

    try {
      await apiClient.patch(`/messaging/rooms/${roomId}/read`);
      setReadSyncFailedRoomIds((prev) => {
        if (!prev.has(roomId)) return prev;
        const next = new Set(prev);
        next.delete(roomId);
        return next;
      });
    } catch (error) {
      // Surfaced (#1557): the local unread clear still improves UX
      // immediately, but the server was never told, so the failure is
      // logged with context and exposed via `readSyncFailedRoomIds` rather
      // than swallowed — a caller can show a "couldn't sync" indicator.
      logError(error instanceof Error ? error : new Error(String(error)), {
        source: 'components/messaging/useMessaging.ts',
        action: 'markRoomAsRead',
        metadata: { roomId },
      });
      setReadSyncFailedRoomIds((prev) => new Set(prev).add(roomId));
    }
  }, []);

  const clearPendingSend = useCallback((clientId: string) => {
    const timeout = pendingTimeoutsRef.current.get(clientId);
    if (timeout) clearTimeout(timeout);
    pendingTimeoutsRef.current.delete(clientId);
    pendingSendsRef.current.delete(clientId);
  }, []);

  // Clear any outstanding send timeouts when the hook unmounts.
  useEffect(() => {
    return () => {
      pendingTimeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
      pendingTimeoutsRef.current.clear();
      pendingSendsRef.current.clear();
    };
  }, []);

  // ── Fetch rooms on mount ──────────────────────────────────────────────
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

  // ── Socket.io connection ──────────────────────────────────────────────
  useEffect(() => {
    if (!accessToken || !user) return;

    const socket = io(SOCKET_URL, {
      auth: { token: accessToken },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1_000,
      reconnectionDelayMax: 10_000,
      timeout: 20_000,
    });

    socketRef.current = socket;

    // Fires on the initial connect AND every reconnect (#1557's "reconnection
    // after a dropped socket flushes any queued outbound messages/receipts").
    socket.on('connect', () => {
      setIsConnected(true);
      flushQueuedMessagesRef.current().catch((error) => {
        logError(error instanceof Error ? error : new Error(String(error)), {
          source: 'components/messaging/useMessaging.ts',
          action: 'flushQueuedMessages:onConnect',
        });
      });
    });
    socket.on('disconnect', () => setIsConnected(false));

    // New message from server (also fires as the echo of our own sends)
    socket.on('message', (message: Message & { clientId?: string }) => {
      const { clientId: incomingClientId, ...serverMessage } = message;

      setMessages((prev: Message[]) => {
        if (prev.some((m: Message) => m.id === serverMessage.id)) return prev;

        // Reconcile against an optimistic message we're waiting on: prefer
        // matching the clientId the server echoed back, else fall back to
        // the oldest pending message with the same content in this room
        // (covers gateways that don't echo clientId).
        const matched =
          (incomingClientId && prev.find((m) => m.id === incomingClientId)) ||
          (serverMessage.senderId === user?.id
            ? prev.find(
                (m) =>
                  m.status === 'pending' &&
                  m.roomId === serverMessage.roomId &&
                  m.content === serverMessage.content,
              )
            : undefined);

        if (matched) {
          clearPendingSend(matched.id);
          return prev.map((m) =>
            m.id === matched.id ? { ...serverMessage, status: 'sent' } : m,
          );
        }

        return [...prev, serverMessage];
      });

      setRooms((prev: ChatRoom[]) =>
        prev.map((r: ChatRoom) =>
          r.id === serverMessage.roomId
            ? { ...r, lastMessage: serverMessage }
            : r,
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

  // ── Select a room ─────────────────────────────────────────────────────
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

  // ── Send a message ────────────────────────────────────────────────────
  // Dispatches (or re-dispatches, for retry) the network call for an
  // already-optimistic message identified by clientId.
  const dispatchSend = useCallback(
    (clientId: string) => {
      const pending = pendingSendsRef.current.get(clientId);
      if (!pending || !socketRef.current) return;

      setMessages((prev: Message[]) =>
        prev.map((m) => (m.id === clientId ? { ...m, status: 'pending' } : m)),
      );

      if (pending.attachment) {
        const formData = new FormData();
        formData.append('file', pending.attachment);
        if (pending.content) formData.append('content', pending.content);
        formData.append('roomId', pending.roomId);

        apiClient
          .post<Message>(
            `/messaging/rooms/${pending.roomId}/messages/attachment`,
            formData as unknown as Record<string, unknown>,
          )
          .then(({ data }) => {
            clearPendingSend(clientId);
            setMessages((prev: Message[]) =>
              prev.map((m) =>
                m.id === clientId ? { ...data, status: 'sent' } : m,
              ),
            );
          })
          .catch(() => {
            setMessages((prev: Message[]) =>
              prev.map((m) =>
                m.id === clientId ? { ...m, status: 'failed' } : m,
              ),
            );
          });
        return;
      }

      const timeout = setTimeout(() => {
        pendingTimeoutsRef.current.delete(clientId);
        setMessages((prev: Message[]) =>
          prev.map((m) =>
            m.id === clientId && m.status === 'pending'
              ? { ...m, status: 'failed' }
              : m,
          ),
        );
      }, SEND_TIMEOUT_MS);
      pendingTimeoutsRef.current.set(clientId, timeout);

      const payload: SendMessagePayload = {
        roomId: pending.roomId,
        content: pending.content,
        clientId,
      };

      socketRef.current.emit('sendMessage', payload, (ack?: SendMessageAck) => {
        if (!ack) return; // Gateway has no ack support — rely on echo/timeout.

        if (ack.message) {
          clearPendingSend(clientId);
          setMessages((prev: Message[]) =>
            prev.map((m) =>
              m.id === clientId ? { ...ack.message!, status: 'sent' } : m,
            ),
          );
        } else if (ack.error) {
          const t = pendingTimeoutsRef.current.get(clientId);
          if (t) clearTimeout(t);
          pendingTimeoutsRef.current.delete(clientId);
          setMessages((prev: Message[]) =>
            prev.map((m) =>
              m.id === clientId ? { ...m, status: 'failed' } : m,
            ),
          );
        }
      });
    },
    [clearPendingSend],
  );

  // Re-dispatches every message queued while offline (#1557), on (re)connect.
  // Reads the shared offline sync queue, filters to this hook's own entity,
  // restores each into `pendingSendsRef` so `dispatchSend` can emit it over
  // the now-live socket, and removes the queue entry once the emit call has
  // actually been made (the ack/timeout/echo path in `dispatchSend` then
  // takes over exactly as it does for a normal send).
  const flushQueuedMessages = useCallback(async () => {
    let queued: SyncQueueItem[];
    try {
      queued = await getSyncQueue();
    } catch (error) {
      logError(error instanceof Error ? error : new Error(String(error)), {
        source: 'components/messaging/useMessaging.ts',
        action: 'flushQueuedMessages:read',
      });
      return;
    }

    const messageItems = queued.filter(
      (item) => item.entity === QUEUED_MESSAGE_ENTITY,
    );

    for (const item of messageItems) {
      const payload = item.payload as QueuedMessagePayload;

      pendingSendsRef.current.set(payload.clientId, {
        roomId: payload.roomId,
        content: payload.content,
      });
      setMessages((prev: Message[]) =>
        prev.map((m) =>
          m.id === payload.clientId ? { ...m, status: 'pending' } : m,
        ),
      );

      dispatchSend(payload.clientId);

      try {
        await removeSyncQueueItem(item.id);
      } catch (error) {
        logError(error instanceof Error ? error : new Error(String(error)), {
          source: 'components/messaging/useMessaging.ts',
          action: 'flushQueuedMessages:remove',
          metadata: { clientId: payload.clientId },
        });
      }
    }
  }, [dispatchSend]);

  useEffect(() => {
    flushQueuedMessagesRef.current = flushQueuedMessages;
  }, [flushQueuedMessages]);

  // Also flush immediately when the browser regains connectivity, rather
  // than waiting on the socket's own reconnect timing.
  useEffect(() => {
    if (isOnline) {
      flushQueuedMessagesRef.current().catch((error) => {
        logError(error instanceof Error ? error : new Error(String(error)), {
          source: 'components/messaging/useMessaging.ts',
          action: 'flushQueuedMessages:onOnline',
        });
      });
    }
  }, [isOnline]);

  const sendMessage = useCallback(
    (content: string, attachment?: File) => {
      if (!activeRoom || (!content.trim() && !attachment) || !user) return;

      const clientId = generateClientId();
      const trimmed = content.trim();
      // Attachments aren't queued offline (#1557 scopes queueing to text
      // messages, matching what the offline sync queue can actually
      // replay); an attachment send while offline still requires the
      // socket the way it always did.
      const offline = !isOnlineRef.current && !attachment;

      const optimisticMessage: Message = {
        id: clientId,
        content: trimmed,
        senderId: user.id,
        roomId: activeRoom.id,
        createdAt: new Date().toISOString(),
        readAt: null,
        status: offline ? 'queued' : 'pending',
        sender: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role as 'user' | 'admin',
        },
      };

      setMessages((prev: Message[]) => [...prev, optimisticMessage]);
      pendingSendsRef.current.set(clientId, {
        roomId: activeRoom.id,
        content: trimmed,
        attachment,
      });

      if (offline) {
        addToSyncQueue({
          action: 'create',
          entity: QUEUED_MESSAGE_ENTITY,
          entityId: clientId,
          payload: {
            roomId: activeRoom.id,
            content: trimmed,
            clientId,
          } satisfies QueuedMessagePayload,
        }).catch((error) => {
          logError(error instanceof Error ? error : new Error(String(error)), {
            source: 'components/messaging/useMessaging.ts',
            action: 'queueOfflineMessage',
            metadata: { roomId: activeRoom.id, clientId },
          });
        });
        return;
      }

      if (!socketRef.current) return;
      dispatchSend(clientId);
    },
    [activeRoom, user, dispatchSend],
  );

  // Re-attempts a message that previously failed to send.
  const retryMessage = useCallback(
    (clientId: string) => {
      dispatchSend(clientId);
    },
    [dispatchSend],
  );

  // ── Typing indicator ──────────────────────────────────────────────────
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

  // ── Create a new room ─────────────────────────────────────────────────
  const createRoom = useCallback(
    async (participantId: string): Promise<ChatRoom | null> => {
      try {
        const { data } = await apiClient.post<ChatRoom>('/messaging/rooms', {
          participantId,
        });
        setRooms((prev: ChatRoom[]) => {
          if (prev.some((r: ChatRoom) => r.id === data.id)) return prev;
          return [data, ...prev];
        });
        return data;
      } catch {
        return null;
      }
    },
    [],
  );

  return {
    rooms,
    activeRoom,
    messages,
    typingUsers,
    isConnected,
    isLoadingRooms,
    isLoadingMessages,
    readSyncFailedRoomIds,
    selectRoom,
    sendMessage,
    retryMessage,
    sendTyping,
    createRoom,
  };
}
