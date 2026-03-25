'use client';

import React from 'react';
import { Search, MessageSquare } from 'lucide-react';
import type { ChatRoom } from './types';
import { UserAvatar } from './UserAvatar';
import { useAuthStore } from '@/store/authStore';

interface ChatSidebarProps {
  rooms: ChatRoom[];
  activeRoom: ChatRoom | null;
  isLoading: boolean;
  onSelectRoom: (room: ChatRoom) => void;
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays === 0) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return date.toLocaleDateString([], { weekday: 'short' });
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function getOtherParticipant(room: ChatRoom, currentUserId: string) {
  return room.participants.find((p) => p.userId !== currentUserId)?.user;
}

export function ChatSidebar({
  rooms,
  activeRoom,
  isLoading,
  onSelectRoom,
}: ChatSidebarProps) {
  const { user } = useAuthStore();
  const [query, setQuery] = React.useState('');

  const filtered = rooms.filter((room) => {
    if (!query) return true;
    const other = getOtherParticipant(room, user?.id ?? '');
    const name = other
      ? `${other.firstName} ${other.lastName}`.toLowerCase()
      : '';
    const last = room.lastMessage?.content?.toLowerCase() ?? '';
    return (
      name.includes(query.toLowerCase()) || last.includes(query.toLowerCase())
    );
  });

  return (
    <aside
      className="w-80 shrink-0 border-r border-neutral-200 bg-white flex flex-col h-full"
      aria-label="Conversations"
    >
      {/* Header */}
      <div className="px-5 pt-6 pb-4 border-b border-neutral-100">
        <h1 className="text-lg font-bold text-neutral-900 mb-4">Messages</h1>
        {/* Search */}
        <div className="relative">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none"
          />
          <input
            type="search"
            placeholder="Search conversations…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-neutral-100 rounded-xl border border-transparent focus:border-blue-300 focus:bg-white focus:outline-none transition-all placeholder:text-neutral-400"
            aria-label="Search conversations"
          />
        </div>
      </div>

      {/* Room List */}
      <div className="flex-1 overflow-y-auto" role="list">
        {isLoading ? (
          // Skeleton
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-5 py-4">
              <div className="w-10 h-10 rounded-full bg-neutral-100 animate-pulse shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 bg-neutral-100 rounded-full animate-pulse w-2/3" />
                <div className="h-3 bg-neutral-100 rounded-full animate-pulse w-full" />
              </div>
            </div>
          ))
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-16 text-center px-6">
            <div className="w-12 h-12 rounded-2xl bg-neutral-100 flex items-center justify-center mb-3">
              <MessageSquare size={22} className="text-neutral-400" />
            </div>
            <p className="text-sm font-medium text-neutral-700">
              {query ? 'No results found' : 'No conversations yet'}
            </p>
            <p className="text-xs text-neutral-400 mt-1">
              {query
                ? 'Try a different search'
                : 'Start a chat from a property or profile page'}
            </p>
          </div>
        ) : (
          filtered.map((room) => {
            const other = getOtherParticipant(room, user?.id ?? '');
            const isActive = activeRoom?.id === room.id;
            const lastMsg = room.lastMessage;
            const hasUnread = (room.unreadCount ?? 0) > 0;

            return (
              <button
                key={room.id}
                role="listitem"
                onClick={() => onSelectRoom(room)}
                className={`w-full flex items-center gap-3 px-5 py-4 text-left transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 ${
                  isActive
                    ? 'bg-blue-50 border-r-2 border-blue-600'
                    : 'hover:bg-neutral-50'
                }`}
                aria-current={isActive ? 'true' : undefined}
                aria-label={`Conversation with ${other ? `${other.firstName} ${other.lastName}` : 'Unknown'}`}
              >
                {other ? (
                  <UserAvatar
                    firstName={other.firstName}
                    lastName={other.lastName}
                    role={other.role}
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-neutral-200 shrink-0" />
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span
                      className={`text-sm font-semibold truncate ${
                        isActive ? 'text-blue-700' : 'text-neutral-900'
                      }`}
                    >
                      {other
                        ? `${other.firstName} ${other.lastName}`
                        : (room.name ?? 'Chat')}
                    </span>
                    {lastMsg && (
                      <span className="text-[11px] text-neutral-400 ml-2 shrink-0">
                        {formatTime(lastMsg.createdAt)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <p
                      className={`text-xs truncate ${
                        hasUnread
                          ? 'text-neutral-700 font-medium'
                          : 'text-neutral-500'
                      }`}
                    >
                      {lastMsg?.content ?? 'No messages yet'}
                    </p>
                    {hasUnread && (
                      <span className="ml-2 shrink-0 min-w-[18px] h-[18px] rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center px-1">
                        {room.unreadCount}
                      </span>
                    )}
                  </div>
                  {other && (
                    <span
                      className={`inline-block mt-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full capitalize ${
                        other.role === 'landlord'
                          ? 'bg-blue-50 text-blue-600'
                          : other.role === 'agent'
                            ? 'bg-orange-50 text-orange-600'
                            : 'bg-emerald-50 text-emerald-600'
                      }`}
                    >
                      {other.role}
                    </span>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
}
