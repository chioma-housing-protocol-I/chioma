import type { Meta, StoryObj } from '@storybook/react';
import { SkeletonCard } from './SkeletonCard';

const meta: Meta<typeof SkeletonCard> = {
  title: 'UI/SkeletonCard',
  component: SkeletonCard,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof SkeletonCard>;

export const Default: Story = {
  render: () => (
    <div className="w-80">
      <SkeletonCard />
    </div>
  ),
};

export const Multiple: Story = {
  render: () => (
    <div className="flex gap-4">
      <div className="w-80">
        <SkeletonCard />
      </div>
      <div className="w-80">
        <SkeletonCard />
      </div>
      <div className="w-80">
        <SkeletonCard />
      </div>
    </div>
  ),
};
