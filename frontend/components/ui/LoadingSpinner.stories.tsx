import type { Meta, StoryObj } from '@storybook/react';
import { LoadingSpinner } from './LoadingSpinner';

const meta: Meta<typeof LoadingSpinner> = {
  title: 'UI/LoadingSpinner',
  component: LoadingSpinner,
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['xs', 'sm', 'md', 'lg'],
      description: 'Size of the spinner',
    },
    variant: {
      control: 'select',
      options: ['primary', 'neutral', 'white'],
      description: 'Color variant of the spinner',
    },
    label: {
      control: 'text',
      description: 'Accessible label text',
    },
    fullScreen: {
      control: 'boolean',
      description: 'Whether to display as a full-screen centered loader',
    },
  },
};

export default meta;
type Story = StoryObj<typeof LoadingSpinner>;

export const Default: Story = {
  args: {
    size: 'md',
    variant: 'primary',
    label: 'Loading',
  },
};

export const Small: Story = {
  args: {
    size: 'sm',
    variant: 'primary',
    label: 'Loading',
  },
};

export const Large: Story = {
  args: {
    size: 'lg',
    variant: 'primary',
    label: 'Loading',
  },
};

export const Neutral: Story = {
  args: {
    size: 'md',
    variant: 'neutral',
    label: 'Loading...',
  },
};

export const White: Story = {
  args: {
    size: 'md',
    variant: 'white',
    label: 'Loading...',
  },
  parameters: {
    backgrounds: { default: 'dark' },
  },
};

export const AllSizes: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <LoadingSpinner size="xs" label="XS" />
      <LoadingSpinner size="sm" label="SM" />
      <LoadingSpinner size="md" label="MD" />
      <LoadingSpinner size="lg" label="LG" />
    </div>
  ),
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <LoadingSpinner variant="primary" label="Primary" />
      <LoadingSpinner variant="neutral" label="Neutral" />
      <LoadingSpinner variant="white" label="White" />
    </div>
  ),
};
