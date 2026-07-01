/**
 * Component tests for MessageInput.
 * Issue: #1255
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { MessageInput } from '@/components/messaging/MessageInput';

describe('MessageInput', () => {
  let onSend: ReturnType<typeof vi.fn>;
  let onTyping: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onSend = vi.fn();
    onTyping = vi.fn();
  });

  it('renders a textarea for message composition', () => {
    render(<MessageInput onSend={onSend} onTyping={onTyping} />);
    expect(screen.getByRole('textbox')).toBeDefined();
  });

  it('renders a send button', () => {
    render(<MessageInput onSend={onSend} onTyping={onTyping} />);
    expect(screen.getByRole('button', { name: /send/i })).toBeDefined();
  });

  it('calls onSend with content when send button is clicked', () => {
    render(<MessageInput onSend={onSend} onTyping={onTyping} />);
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'Hello world' } });
    fireEvent.click(screen.getByRole('button', { name: /send/i }));
    expect(onSend).toHaveBeenCalledWith('Hello world', undefined);
  });

  it('does not call onSend when textarea is empty', () => {
    render(<MessageInput onSend={onSend} onTyping={onTyping} />);
    fireEvent.click(screen.getByRole('button', { name: /send/i }));
    expect(onSend).not.toHaveBeenCalled();
  });

  it('clears textarea after sending', () => {
    render(<MessageInput onSend={onSend} onTyping={onTyping} />);
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'Goodbye' } });
    fireEvent.click(screen.getByRole('button', { name: /send/i }));
    expect(textarea.value).toBe('');
  });

  it('calls onSend on Enter key press (without shift)', () => {
    render(<MessageInput onSend={onSend} onTyping={onTyping} />);
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'Pressed enter' } });
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });
    expect(onSend).toHaveBeenCalledWith('Pressed enter', undefined);
  });

  it('does not send on Shift+Enter (creates newline)', () => {
    render(<MessageInput onSend={onSend} onTyping={onTyping} />);
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'Line 1' } });
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true });
    expect(onSend).not.toHaveBeenCalled();
  });

  it('disables send button when disabled prop is true', () => {
    render(<MessageInput onSend={onSend} onTyping={onTyping} disabled />);
    expect(screen.getByRole('button', { name: /send/i })).toBeDisabled();
  });

  it('calls onTyping(true) when user starts typing', async () => {
    render(<MessageInput onSend={onSend} onTyping={onTyping} />);
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'h' } });
    expect(onTyping).toHaveBeenCalledWith(true);
  });

  it('renders file attachment button', () => {
    render(<MessageInput onSend={onSend} onTyping={onTyping} />);
    const attachBtn = screen.getByRole('button', { name: /attach/i });
    expect(attachBtn).toBeDefined();
  });
});
