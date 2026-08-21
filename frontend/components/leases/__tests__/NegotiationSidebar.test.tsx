import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { NegotiationSidebar } from '../NegotiationSidebar';
import type { Contract, NegotiationOffer, NegotiationMessage } from '@/types/contracts';

vi.mock('react-hot-toast', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const mockContract: Contract = {
  id: 'contract-1',
  propertyName: '101 Park Avenue',
  propertyAddress: '101 Park Avenue, Manhattan, NY',
  landlord: { name: 'Sarah Okafor', walletAddress: 'GA...', role: 'ADMIN' },
  tenant: { name: 'John Doe', walletAddress: 'GB...', role: 'USER' },
  agent: { name: '', walletAddress: '', role: 'USER' },
  rentAmount: '2500',
  securityDeposit: '5000',
  commissionRate: '5',
  startDate: '2026-01-01',
  endDate: '2027-01-01',
  status: 'PENDING',
  stage: 'DRAFTED',
  stellarTxHash: '',
  createdAt: '2026-01-01T00:00:00Z',
  terms: 'Standard lease terms.',
};

const mockOffer: NegotiationOffer = {
  id: 'off-1',
  contractId: 'contract-1',
  proposerRole: 'LANDLORD',
  rentAmount: '2500',
  startDate: '2026-01-01',
  endDate: '2027-01-01',
  message: 'Initial lease terms',
  status: 'PENDING',
  createdAt: '2026-01-01T00:00:00Z',
};

const mockAcceptedOffer: NegotiationOffer = {
  ...mockOffer,
  id: 'off-2',
  status: 'ACCEPTED',
  message: 'Agreed terms',
};

const mockRejectedOffer: NegotiationOffer = {
  ...mockOffer,
  id: 'off-3',
  status: 'REJECTED',
  message: 'Not acceptable',
};

const mockMessages: NegotiationMessage[] = [
  {
    id: 'msg-1',
    senderId: 'landlord-1',
    senderName: 'Sarah Okafor',
    content: 'Hello! Here are the initial lease terms.',
    createdAt: '2026-01-01T12:00:00Z',
  },
  {
    id: 'msg-2',
    senderId: 'user-1',
    senderName: 'John Doe',
    content: 'Looks good, but can we negotiate the rent?',
    createdAt: '2026-01-01T13:00:00Z',
  },
];

describe('NegotiationSidebar', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    contract: mockContract,
    offers: [mockOffer],
    messages: mockMessages,
    onPropose: vi.fn(),
    onAccept: vi.fn(),
    onReject: vi.fn(),
    onSendMessage: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when isOpen is false', () => {
    const { container } = render(
      <NegotiationSidebar {...defaultProps} isOpen={false} />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders the sidebar header with property name', () => {
    render(<NegotiationSidebar {...defaultProps} />);

    expect(screen.getByText('Lease Negotiation')).toBeInTheDocument();
    expect(screen.getByText(/Negotiating terms for 101 Park Avenue/)).toBeInTheDocument();
  });

  it('shows Messages tab by default', () => {
    render(<NegotiationSidebar {...defaultProps} />);

    expect(screen.getByText('Messages')).toBeInTheDocument();
    expect(screen.getByText('Hello! Here are the initial lease terms.')).toBeInTheDocument();
    expect(screen.getByText('Looks good, but can we negotiate the rent?')).toBeInTheDocument();
  });

  it('switches to Offers tab when Offers tab is clicked', () => {
    render(<NegotiationSidebar {...defaultProps} />);

    fireEvent.click(screen.getByText('Offers'));

    expect(screen.getByText('Proposal History')).toBeInTheDocument();
    expect(screen.getByText('Make a Counter-Offer')).toBeInTheDocument();
  });

  it('shows the offer count badge in Offers tab', () => {
    render(<NegotiationSidebar {...defaultProps} />);

    fireEvent.click(screen.getByText('Offers'));

    // The badge should show "1" (one offer)
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('sends a message when send button is clicked', () => {
    const onSendMessage = vi.fn();
    const { container } = render(
      <NegotiationSidebar {...defaultProps} onSendMessage={onSendMessage} />,
    );

    const input = screen.getByPlaceholderText('Type a message...');
    fireEvent.change(input, { target: { value: 'I agree to the terms' } });

    // The send button is inside the relative group wrapper next to the input.
    // Find it by locating the wrapper div that contains the input, then the
    // button within it.
    const wrapper = input.closest('div.relative');
    const sendButton = wrapper?.querySelector('button');
    expect(sendButton).not.toBeNull();
    if (sendButton) {
      fireEvent.click(sendButton);
    }

    expect(onSendMessage).toHaveBeenCalledWith('I agree to the terms');
  });

  it('sends message on Enter key press', () => {
    const onSendMessage = vi.fn();
    render(<NegotiationSidebar {...defaultProps} onSendMessage={onSendMessage} />);

    const input = screen.getByPlaceholderText('Type a message...');
    fireEvent.change(input, { target: { value: 'Hello' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onSendMessage).toHaveBeenCalledWith('Hello');
  });

  it('shows empty messages state when no messages', () => {
    render(<NegotiationSidebar {...defaultProps} messages={[]} />);

    expect(screen.getByText(/No messages yet/)).toBeInTheDocument();
  });

  it('shows "No proposals yet" when offers list is empty', () => {
    render(<NegotiationSidebar {...defaultProps} offers={[]} />);

    fireEvent.click(screen.getByText('Offers'));

    expect(screen.getByText('No proposals yet')).toBeInTheDocument();
  });

  it('allows making a counter-offer', () => {
    const onPropose = vi.fn();
    render(<NegotiationSidebar {...defaultProps} onPropose={onPropose} />);

    fireEvent.click(screen.getByText('Offers'));
    fireEvent.click(screen.getByText('Make a Counter-Offer'));

    // The proposal form should appear
    expect(screen.getByText('Propose New Terms')).toBeInTheDocument();

    // Click Submit
    fireEvent.click(screen.getByText('Submit Proposal'));

    expect(onPropose).toHaveBeenCalled();
  });

  it('accepts a pending offer', () => {
    const onAccept = vi.fn();
    render(
      <NegotiationSidebar
        {...defaultProps}
        onAccept={onAccept}
        offers={[mockOffer]}
      />,
    );

    fireEvent.click(screen.getByText('Offers'));

    const acceptButton = screen.getByText('Accept');
    fireEvent.click(acceptButton);

    expect(onAccept).toHaveBeenCalledWith('off-1');
  });

  it('rejects a pending offer', () => {
    const onReject = vi.fn();
    render(
      <NegotiationSidebar
        {...defaultProps}
        onReject={onReject}
        offers={[mockOffer]}
      />,
    );

    fireEvent.click(screen.getByText('Offers'));

    const rejectButton = screen.getByText('Reject');
    fireEvent.click(rejectButton);

    expect(onReject).toHaveBeenCalledWith('off-1');
  });

  it('shows status stripe color for accepted offers', () => {
    render(
      <NegotiationSidebar
        {...defaultProps}
        offers={[mockAcceptedOffer]}
      />,
    );

    fireEvent.click(screen.getByText('Offers'));

    expect(screen.getByText('ACCEPTED')).toBeInTheDocument();
  });

  it('shows status stripe color for rejected offers', () => {
    render(
      <NegotiationSidebar
        {...defaultProps}
        offers={[mockRejectedOffer]}
      />,
    );

    fireEvent.click(screen.getByText('Offers'));

    expect(screen.getByText('REJECTED')).toBeInTheDocument();
  });
});