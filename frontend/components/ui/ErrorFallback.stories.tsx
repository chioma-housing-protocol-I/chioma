import type { Meta, StoryObj } from '@storybook/react';
import ErrorFallback from '../error/ErrorFallback';

const meta: Meta<typeof ErrorFallback> = {
  title: 'UI/ErrorFallback',
  component: ErrorFallback,
  tags: ['autodocs'],
  argTypes: {
    title: {
      control: 'text',
      description: 'Error title text',
    },
    description: {
      control: 'text',
      description: 'Error description text',
    },
    severity: {
      control: 'select',
      options: ['error', 'warning', 'info', 'critical'],
      description: 'Error severity level',
    },
  },
};

export default meta;
type Story = StoryObj<typeof ErrorFallback>;

export const Default: Story = {
  args: {
    title: 'Something went wrong',
    description:
      'An unexpected issue occurred. You can retry or navigate to a safe page.',
    severity: 'error',
  },
};

export const WithRetry: Story = {
  args: {
    title: 'Connection failed',
    description:
      'Unable to connect to the server. Please check your connection.',
    severity: 'error',
    retry: () => alert('Retrying...'),
  },
};

export const Warning: Story = {
  args: {
    title: 'Partial failure',
    description: 'Some data could not be loaded. The rest is displayed below.',
    severity: 'warning',
    retry: () => alert('Retrying...'),
  },
};

export const InfoSeverity: Story = {
  args: {
    title: 'Maintenance mode',
    description: 'This feature is temporarily unavailable for maintenance.',
    severity: 'info',
  },
};

export const Critical: Story = {
  args: {
    title: 'Critical system error',
    description:
      'A critical error has occurred. Please contact support immediately.',
    severity: 'critical',
  },
};

export const AllSeverities: Story = {
  render: () => (
    <div className="flex flex-col gap-8">
      <ErrorFallback
        title="Error"
        description="Default error state"
        severity="error"
      />
      <ErrorFallback
        title="Warning"
        description="Warning state"
        severity="warning"
      />
      <ErrorFallback
        title="Info"
        description="Informational state"
        severity="info"
      />
    </div>
  ),
};
