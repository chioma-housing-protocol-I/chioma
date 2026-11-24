import type { Meta, StoryObj } from '@storybook/react';
import {
  Skeleton,
  SkeletonAvatar,
  SkeletonCardBlock,
  SkeletonGroup,
  SkeletonTableRow,
  SkeletonText,
} from './Skeleton';

const meta: Meta<typeof Skeleton> = {
  title: 'UI/Skeleton',
  component: Skeleton,
  tags: ['autodocs'],
  argTypes: {
    animate: {
      control: 'boolean',
      description: 'Toggle the pulse animation',
    },
    className: {
      control: 'text',
      description: 'Tailwind classes controlling size and shape',
    },
  },
};

export default meta;
type Story = StoryObj<typeof Skeleton>;

export const Block: Story = {
  args: {
    animate: true,
    className: 'h-6 w-48',
  },
};

export const Static: Story = {
  args: {
    animate: false,
    className: 'h-6 w-48',
  },
};

export const Text: Story = {
  render: () => (
    <div className="w-80">
      <SkeletonText lines={4} />
    </div>
  ),
};

export const Avatars: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <SkeletonAvatar size="sm" />
      <SkeletonAvatar size="md" />
      <SkeletonAvatar size="lg" />
      <SkeletonAvatar size="lg" shape="square" />
    </div>
  ),
};

export const Card: Story = {
  render: () => (
    <div className="grid w-full max-w-3xl grid-cols-1 gap-4 sm:grid-cols-2">
      <SkeletonCardBlock />
      <SkeletonCardBlock media={false} header lines={3} />
    </div>
  ),
};

export const TableRows: Story = {
  render: () => (
    <div className="w-full max-w-2xl space-y-2">
      {Array.from({ length: 3 }).map((_, index) => (
        <SkeletonTableRow key={index} columns={5} />
      ))}
    </div>
  ),
};

export const ComposedListItem: Story = {
  render: () => (
    <SkeletonGroup label="Loading tenants" className="w-96 space-y-4">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="flex items-center gap-3">
          <SkeletonAvatar />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
          </div>
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
      ))}
    </SkeletonGroup>
  ),
};

export const ComposedPropertyCard: Story = {
  render: () => (
    <SkeletonGroup label="Loading property" className="w-80">
      <SkeletonCardBlock>
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <SkeletonText lines={2} />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-24 rounded-lg" />
          <Skeleton className="h-8 w-24 rounded-lg" />
        </div>
      </SkeletonCardBlock>
    </SkeletonGroup>
  ),
};
