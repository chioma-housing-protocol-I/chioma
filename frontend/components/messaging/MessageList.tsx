'use client';

import React, { useEffect, useRef } from 'react';
import { CheckCheck, Check } from 'lucide-react';
import type { Message } from './types';
import { UserAvatar } from './UserAvatar';
import { useAuthStore } from '@/store/authStore';

interface MessageListProps {
  messages: Message[];
  typingUsers: Set<string>;
  isLoading: boolean;
}

function formatMessageTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDateDivider(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return date.toLocaleDateString([], {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

function groupMessagesByDate(messages: Message[]) {
  const groups: { date: string; messages: Message[] }[] = [];

  for (const msg of messages) {
    const dateKey = new Date(msg.createdAt).toDateString();
    const last = groups[groups.length - 1];
    if (last && last.date === dateKey) {
      last.messages.push(msg);
    } else {
      groups.push({ date: dateKey, messages: [msg] });
    }
  }

  return groups;
}

export function MessageList({
  messages,
  typingUsers,
  isLoading,
}: MessageListProps) {
  const { user } = useAuthStore();
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUsers]);

  if (isLoading) {
    return (
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className={`flex gap-3 ${i % 2 === 0 ? '' : 'flex-row-reverse'}`}
          >
            <div className="w-8 h-8 rounded-full bg-neutral-100 animate-pulse shrink-0" />
            <div
              className={`h-10 bg-neutral-100 animate-pulse rounded-2xl ${
                i % 2 === 0 ? 'w-48' : 'w-64'
              }`}
            />
          </div>
        ))}
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-3xl bg-blue-50 flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-blue-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
          </div>
          <p className="text-sm font-semibold text-neutral-700">
            Start the conversation
          </p>
          <p className="text-xs text-neutral-400 mt-1">
            Send a message below to get started
          </p>
        </div>
      </div>
    );
  }

  const groups = groupMessagesByDate(messages);

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto px-6 py-4 space-y-6"
      role="log"
      aria-label="Messages"
      aria-live="polite"
    >
      {groups.map((group) => (
        <div key={group.date}>
          {/* Date Divider */}
          <div className="flex items-center gap-3 my-4" aria-hidden="true">
            <div className="flex-1 h-px bg-neutral-200" />
            <span className="text-[11px] font-medium text-neutral-400 px-2">
              {formatDateDivider(group.messages[0].createdAt)}
            </span>
            <div className="flex-1 h-px bg-neutral-200" />
          </div>

          {/* Messages in group */}
          <div className="space-y-1">
            {group.messages.map((message, idx) => {
              const isMine = message.senderId === user?.id;
              const prevMsg = group.messages[idx - 1];
              const nextMsg = group.messages[idx + 1];
              const isFirstInSequence =
                !prevMsg || prevMsg.senderId !== message.senderId;
              const isLastInSequence =
                !nextMsg || nextMsg.senderId !== message.senderId;

              return (
                <div
                  key={message.id}
                  className={`flex items-end gap-2 ${isMine ? 'flex-row-reverse' : ''} ${
                    isFirstInSequence ? 'mt-3' : 'mt-0.5'
                  }`}
                >
                  {/* Avatar — only show on last message in sequence */}
                  <div className="w-8 shrink-0">
                    {!isMine && isLastInSequence ? (
                      <UserAvatar
                        firstName={message.sender.firstName}
                        lastName={message.sender.lastName}
                        role={message.sender.role}
                        size="sm"
                      />
                    ) : null}
                  </div>

                  {/* Bubble */}
                  <div
                    className={`max-w-[70%] group ${isMine ? 'items-end' : 'items-start'} flex flex-col`}
                  >
                    {/* Sender name — only on first message in sequence for received */}
                    {!isMine && isFirstInSequence && (
                      <span className="text-[11px] font-medium text-neutral-500 mb-1 ml-1">
                        {message.sender.firstName} {message.sender.lastName}
                      </span>
                    )}

                    <div
                      className={`px-4 py-2.5 text-sm leading-relaxed ${
                        isMine
                          ? 'bg-blue-600 text-white'
                          : 'bg-neutral-100 text-neutral-900'
                      } ${
                        isMine
                          ? isFirstInSequence && isLastInSequence
                            ? 'rounded-2xl rounded-br-sm'
                            : isFirstInSequence
                              ? 'rounded-2xl rounded-br-sm'
                              : isLastInSequence
                                ? 'rounded-2xl rounded-tr-sm rounded-br-sm'
                                : 'rounded-2xl rounded-r-sm'
                          : isFirstInSequence && isLastInSequence
                            ? 'rounded-2xl rounded-bl-sm'
                            : isFirstInSequence
                              ? 'rounded-2xl rounded-bl-sm'
                              : isLastInSequence
                                ? 'rounded-2xl rounded-tl-sm rounded-bl-sm'
                                : 'rounded-2xl rounded-l-sm'
                      }`}
                    >
                      {message.content}
                    </div>

                    {/* Timestamp — shows on hover */}
                    {isLastInSequence && (
                      <div
                        className={`flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity ${
                          isMine ? 'flex-row-reverse' : ''
                        }`}
                      >
                        <span className="text-[10px] text-neutral-400">
                          {formatMessageTime(message.createdAt)}
                        </span>
                        {isMine && (
                          <span aria-label={message.readAt ? 'Read' : 'Sent'}>
                            {message.readAt ? (
                              <CheckCheck size={11} className="text-blue-400" />
                            ) : (
                              <Check size={11} className="text-neutral-400" />
                            )}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Typing indicator */}
      {typingUsers.size > 0 && (
        <div
          className="flex items-end gap-2 mt-3"
          aria-live="polite"
          aria-label="Someone is typing"
        >
          <div className="w-8 shrink-0" />
          <div className="bg-neutral-100 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 animate-bounce [animation-delay:0ms]" />
            <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 animate-bounce [animation-delay:150ms]" />
            <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 animate-bounce [animation-delay:300ms]" />
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
