import type { Meta, StoryObj } from '@storybook/react';
import { SkeletonLoader } from './SkeletonLoader';

const meta: Meta<typeof SkeletonLoader> = {
  title: 'UI/SkeletonLoader',
  component: SkeletonLoader,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['text', 'card', 'avatar', 'table-row'],
      description: 'Skeleton variant to display',
    },
    lines: {
      control: 'number',
      description: 'Number of text lines (text variant only)',
    },
  },
};

export default meta;
type Story = StoryObj<typeof SkeletonLoader>;

export const Text: Story = {
  args: {
    variant: 'text',
    lines: 3,
  },
};

export const Card: Story = {
  args: {
    variant: 'card',
  },
};

export const Avatar: Story = {
  args: {
    variant: 'avatar',
  },
};

export const TableRow: Story = {
  args: {
    variant: 'table-row',
  },
};

export const TextLines: Story = {
  args: {
    variant: 'text',
    lines: 5,
  },
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-8 w-80">
      <div>
        <h3 className="text-sm font-medium mb-2">Text (3 lines)</h3>
        <SkeletonLoader variant="text" lines={3} />
      </div>
      <div>
        <h3 className="text-sm font-medium mb-2">Card</h3>
        <SkeletonLoader variant="card" />
      </div>
      <div>
        <h3 className="text-sm font-medium mb-2">Avatar</h3>
        <SkeletonLoader variant="avatar" />
      </div>
      <div>
        <h3 className="text-sm font-medium mb-2">Table Row</h3>
        <SkeletonLoader variant="table-row" />
      </div>
    </div>
  ),
};
