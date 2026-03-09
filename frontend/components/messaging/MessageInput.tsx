'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Send, Paperclip } from 'lucide-react';

interface MessageInputProps {
  onSend: (content: string) => void;
  onTyping: (isTyping: boolean) => void;
  disabled?: boolean;
}

const TYPING_DEBOUNCE_MS = 1500;

export function MessageInput({
  onSend,
  onTyping,
  disabled = false,
}: MessageInputProps) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 144)}px`; // max ~6 lines
  }, [value]);

  const stopTyping = useCallback(() => {
    if (isTypingRef.current) {
      isTypingRef.current = false;
      onTyping(false);
    }
  }, [onTyping]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);

    // Fire typing:true once per sequence
    if (!isTypingRef.current && e.target.value.trim()) {
      isTypingRef.current = true;
      onTyping(true);
    }

    // Debounce typing:false
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(stopTyping, TYPING_DEBOUNCE_MS);
  };

  const handleSend = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;

    onSend(trimmed);
    setValue('');
    stopTyping();

    // Refocus after send
    requestAnimationFrame(() => textareaRef.current?.focus());
  }, [value, disabled, onSend, stopTyping]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Send on Enter (not Shift+Enter)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      stopTyping();
    };
  }, [stopTyping]);

  const canSend = value.trim().length > 0 && !disabled;

  return (
    <div className="border-t border-neutral-200 bg-white px-4 py-4">
      <div className="flex items-end gap-3">
        {/* Attachment button (UI only — scope of this issue is text) */}
        <button
          type="button"
          disabled={disabled}
          className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors disabled:opacity-40"
          aria-label="Attach file (coming soon)"
          title="Attach file (coming soon)"
        >
          <Paperclip size={18} />
        </button>

        {/* Textarea */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            rows={1}
            placeholder={
              disabled
                ? 'Select a conversation…'
                : 'Type a message… (Enter to send)'
            }
            className="w-full resize-none rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-blue-400 focus:bg-white transition-all leading-relaxed disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Message input"
            aria-multiline="true"
          />
        </div>

        {/* Send Button */}
        <button
          type="button"
          onClick={handleSend}
          disabled={!canSend}
          className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-150 ${
            canSend
              ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm hover:shadow-md'
              : 'bg-neutral-100 text-neutral-400 cursor-not-allowed'
          }`}
          aria-label="Send message"
        >
          <Send size={16} className={canSend ? 'translate-x-px' : ''} />
        </button>
      </div>

      <p className="text-[10px] text-neutral-400 mt-2 ml-12">
        Press{' '}
        <kbd className="px-1 py-0.5 bg-neutral-100 rounded text-[10px]">
          Enter
        </kbd>{' '}
        to send &nbsp;·&nbsp;
        <kbd className="px-1 py-0.5 bg-neutral-100 rounded text-[10px]">
          Shift + Enter
        </kbd>{' '}
        for new line
      </p>
    </div>
  );
}
