'use client';

import React, { useState } from 'react';
import { Menu, MessageSquare, Wifi, WifiOff } from 'lucide-react';
import { ChatSidebar } from '@/components/messaging/ChatSidebar';
import { MessageList } from '@/components/messaging/MessageList';
import { MessageInput } from '@/components/messaging/MessageInput';
import { UserAvatar } from '@/components/messaging/UserAvatar';
import { useMessaging } from '@/components/messaging/useMessaging';
import { useAuthStore } from '@/store/authStore';
import type { ChatRoom } from '@/components/messaging/types';

function getOtherParticipant(room: ChatRoom, currentUserId: string) {
  return room.participants.find((p) => p.userId !== currentUserId)?.user;
}

export function MessagingHub() {
  const { user } = useAuthStore();
  const {
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
    createRoom: _createRoom,
  } = useMessaging();

  const [showSidebar, setShowSidebar] = useState(true);

  const handleSelectRoom = (room: ChatRoom) => {
    selectRoom(room);
    setShowSidebar(false);
  };

  const otherUser = activeRoom
    ? getOtherParticipant(activeRoom, user?.id ?? '')
    : null;

  return (
    <div className="flex h-screen bg-white">
      <div
        className={`${showSidebar ? 'flex' : 'hidden'} md:flex flex-col shrink-0`}
      >
        <ChatSidebar
          rooms={rooms}
          activeRoom={activeRoom}
          isLoading={isLoadingRooms}
          onSelectRoom={handleSelectRoom}
        />
      </div>

      <div
        className={`${!showSidebar ? 'flex' : 'hidden'} md:flex flex-1 flex-col min-w-0`}
      >
        {activeRoom ? (
          <>
            <header className="h-16 px-5 border-b border-neutral-200 flex items-center gap-3 bg-white shrink-0">
              <button
                onClick={() => setShowSidebar(true)}
                className="md:hidden p-2 rounded-lg hover:bg-neutral-100 text-neutral-600 transition-colors"
                aria-label="Back to conversations"
              >
                <Menu size={20} />
              </button>

              {otherUser ? (
                <UserAvatar
                  firstName={otherUser.firstName}
                  lastName={otherUser.lastName}
                  role={otherUser.role}
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-neutral-200" />
              )}

              <div className="flex-1 min-w-0">
                <h2 className="text-sm font-semibold text-neutral-900 truncate">
                  {otherUser
                    ? `${otherUser.firstName} ${otherUser.lastName}`
                    : (activeRoom.name ?? 'Chat')}
                </h2>
                <div className="flex items-center gap-1.5">
                  {typingUsers.size > 0 ? (
                    <span className="text-xs text-blue-500 font-medium animate-pulse">
                      typing...
                    </span>
                  ) : (
                    <span
                      className={`flex items-center gap-1 text-xs ${
                        isConnected ? 'text-emerald-500' : 'text-neutral-400'
                      }`}
                    >
                      {isConnected ? (
                        <>
                          <Wifi size={11} />
                          <span>Connected</span>
                        </>
                      ) : (
                        <>
                          <WifiOff size={11} />
                          <span>Reconnecting...</span>
                        </>
                      )}
                    </span>
                  )}
                </div>
              </div>
            </header>

            <MessageList
              messages={messages}
              typingUsers={typingUsers}
              isLoading={isLoadingMessages}
            />

            <MessageInput
              onSend={sendMessage}
              onTyping={sendTyping}
              disabled={!isConnected}
            />
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center bg-neutral-50 p-8">
            <button
              onClick={() => setShowSidebar(true)}
              className="md:hidden mb-6 text-sm text-blue-600 font-medium hover:underline"
            >
              Back to conversations
            </button>
            <div className="w-20 h-20 rounded-3xl bg-blue-50 flex items-center justify-center mb-5">
              <MessageSquare size={36} className="text-blue-400" />
            </div>
            <h3 className="text-base font-semibold text-neutral-800 mb-1">
              Your messages
            </h3>
            <p className="text-sm text-neutral-500 text-center max-w-xs">
              Select a conversation from the sidebar, or start a new chat from a
              property or profile page.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
