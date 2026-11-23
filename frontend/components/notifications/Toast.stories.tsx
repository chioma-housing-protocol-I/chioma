import type { Meta, StoryObj } from '@storybook/react';
import { ToastContainer, ToastItem } from './Toast';

const meta: Meta<typeof ToastItem> = {
  title: 'Notifications/Toast',
  component: ToastItem,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof ToastItem>;

export const Success: Story = {
  args: {
    id: 't-success',
    type: 'success',
    title: 'Agreement Signed',
    message: 'Your lease agreement has been signed and verified on-chain.',
    duration: 4000,
  },
};

export const Error: Story = {
  args: {
    id: 't-error',
    type: 'error',
    title: 'Transaction Failed',
    message: 'Insufficient balance to complete the escrow deposit.',
    duration: 4000,
  },
};

export const Warning: Story = {
  args: {
    id: 't-warning',
    type: 'warning',
    title: 'Maintenance Inspection Due',
    message: 'Inspection is scheduled for tomorrow at 10:00 AM.',
    duration: 4000,
  },
};

export const InfoWithAction: Story = {
  args: {
    id: 't-info',
    type: 'info',
    title: 'New Message',
    message: 'Landlord replied to your inquiry.',
    action: {
      label: 'View Message',
      onClick: () => alert('Navigating to message...'),
    },
    duration: 4000,
  },
};

export const StackedInCorner = () => {
  const sampleToasts = [
    {
      id: '1',
      type: 'success' as const,
      title: 'Payment Confirmed',
      message: 'Deposit of $1,200 USDC confirmed.',
    },
    {
      id: '2',
      type: 'info' as const,
      title: 'Document Ready',
      message: 'Your tenancy agreement is ready for download.',
    },
    {
      id: '3',
      type: 'warning' as const,
      title: 'Wallet Verification',
      message: 'Please complete your KYC verification.',
    },
  ];

  return <ToastContainer toasts={sampleToasts} position="bottom-right" />;
};
