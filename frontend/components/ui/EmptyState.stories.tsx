import type { Meta, StoryObj } from '@storybook/react';
import { Inbox, Search, FolderOpen } from 'lucide-react';
import { EmptyState } from './EmptyState';

const meta: Meta<typeof EmptyState> = {
  title: 'UI/EmptyState',
  component: EmptyState,
  tags: ['autodocs'],
  argTypes: {
    title: {
      control: 'text',
      description: 'Title text',
    },
    description: {
      control: 'text',
      description: 'Description text',
    },
    actionLabel: {
      control: 'text',
      description: 'Label for the action button',
    },
    variant: {
      control: 'select',
      options: ['default', 'dark'],
      description: 'Color variant',
    },
  },
};

export default meta;
type Story = StoryObj<typeof EmptyState>;

export const Default: Story = {
  args: {
    icon: Inbox,
    title: 'No messages',
    description:
      "You don't have any messages yet. Start a conversation to see messages here.",
    actionLabel: 'Start conversation',
    variant: 'default',
  },
};

export const Dark: Story = {
  args: {
    icon: Search,
    title: 'No results found',
    description: 'Try adjusting your search terms or filters.',
    actionLabel: 'Clear filters',
    variant: 'dark',
  },
};

export const WithoutAction: Story = {
  args: {
    icon: FolderOpen,
    title: 'Empty folder',
    description: 'This folder is empty. Upload files to get started.',
    variant: 'default',
  },
};

export const WithoutIcon: Story = {
  args: {
    title: 'No data available',
    description: 'There is no data to display at this time.',
    variant: 'default',
  },
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex gap-8">
      <div className="w-80">
        <EmptyState
          icon={Inbox}
          title="Default variant"
          description="Empty state with default styling."
          actionLabel="Action"
          variant="default"
        />
      </div>
      <div className="w-80">
        <EmptyState
          icon={Inbox}
          title="Dark variant"
          description="Empty state with dark styling."
          actionLabel="Action"
          variant="dark"
        />
      </div>
    </div>
  ),
};
