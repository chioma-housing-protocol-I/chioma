import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import {
  MOCK_LEASE_CONTRACT as mockContract,
  MOCK_NEGOTIATION_OFFERS as mockOffers,
  MOCK_NEGOTIATION_MESSAGES as mockMessages,
} from './fixtures';

const mockUseAuthStore = vi.fn();

vi.mock('@/store/authStore', () => ({
  useAuthStore: () => mockUseAuthStore(),
}));

import { NegotiationSidebar } from '../NegotiationSidebar';

function renderSidebar(
  overrides: Partial<React.ComponentProps<typeof NegotiationSidebar>> = {},
) {
  const props = {
    isOpen: true,
    onClose: vi.fn(),
    contract: mockContract,
    offers: mockOffers,
    messages: mockMessages,
    onPropose: vi.fn(),
    onAccept: vi.fn(),
    onReject: vi.fn(),
    onSendMessage: vi.fn(),
    ...overrides,
  };
  const utils = render(React.createElement(NegotiationSidebar, props));
  return { ...utils, props };
}

describe('NegotiationSidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuthStore.mockReturnValue({
      user: { id: 'user-1', role: 'user' },
    });
  });

  it('renders nothing when closed', () => {
    const { container } = renderSidebar({ isOpen: false });
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the property name and existing messages on the chat tab', () => {
    renderSidebar();

    expect(
      screen.getByText(/Negotiating terms for Sunset Apartments/),
    ).toBeInTheDocument();
    expect(screen.getByText('Hello there')).toBeInTheDocument();
  });

  it('sends a new message when the send button is clicked', () => {
    const onSendMessage = vi.fn();
    renderSidebar({ onSendMessage });

    const input = screen.getByPlaceholderText('Type a message...');
    fireEvent.change(input, { target: { value: 'Sounds good' } });

    const sendButton = input.parentElement!.querySelector(
      'button',
    ) as HTMLButtonElement;
    fireEvent.click(sendButton);

    expect(onSendMessage).toHaveBeenCalledWith('Sounds good');
  });

  it('switches to the offers tab and lists offers with counts', () => {
    renderSidebar();

    fireEvent.click(screen.getByText('Offers'));

    expect(screen.getByText('Proposal History')).toBeInTheDocument();
    expect(screen.getByText("LANDLORD's Proposal")).toBeInTheDocument();
    expect(screen.getByText('PENDING')).toBeInTheDocument();
  });

  it('accepts a pending offer from a different proposer', () => {
    const onAccept = vi.fn();
    renderSidebar({ onAccept });

    fireEvent.click(screen.getByText('Offers'));
    fireEvent.click(screen.getByText('Accept'));

    expect(onAccept).toHaveBeenCalledWith('off-1');
  });

  it('rejects a pending offer from a different proposer', () => {
    const onReject = vi.fn();
    renderSidebar({ onReject });

    fireEvent.click(screen.getByText('Offers'));
    fireEvent.click(screen.getByText('Reject'));

    expect(onReject).toHaveBeenCalledWith('off-1');
  });

  it('submits a counter-proposal with the entered terms', () => {
    const onPropose = vi.fn();
    renderSidebar({ onPropose });

    fireEvent.click(screen.getByText('Offers'));
    fireEvent.click(screen.getByText('Make a Counter-Offer'));

    const rentInput = screen.getByDisplayValue('2000');
    fireEvent.change(rentInput, { target: { value: '2200' } });

    fireEvent.click(screen.getByText('Submit Proposal'));

    expect(onPropose).toHaveBeenCalledWith(
      expect.objectContaining({
        rentAmount: '2200',
        contractId: 'lease-1',
        proposerRole: 'TENANT',
      }),
    );
  });

  it('shows an empty state when there are no messages', () => {
    renderSidebar({ messages: [] });
    expect(
      screen.getByText(
        (_, element) =>
          element?.tagName.toLowerCase() === 'p' &&
          Boolean(element?.textContent?.includes('No messages yet.')),
      ),
    ).toBeInTheDocument();
  });

  it('shows an empty state when there are no offers', () => {
    renderSidebar({ offers: [] });
    fireEvent.click(screen.getByText('Offers'));
    expect(screen.getByText('No proposals yet')).toBeInTheDocument();
  });

  it('calls onClose when the close button is clicked', () => {
    const onClose = vi.fn();
    renderSidebar({ onClose });

    const closeButtons = screen.getAllByRole('button');
    fireEvent.click(closeButtons[0]);
    expect(onClose).toHaveBeenCalled();
  });
});
