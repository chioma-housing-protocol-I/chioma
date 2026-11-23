import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { fn } from 'storybook/test';
import { Tag } from './tag';

const meta: Meta<typeof Tag> = {
  title: 'UI/Tag',
  component: Tag,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: [
        'default',
        'secondary',
        'destructive',
        'outline',
        'success',
        'warning',
        'info',
        'error',
        'neutral',
        'purple',
      ],
      description: 'Color scheme of the tag',
    },
    children: {
      control: 'text',
      description: 'Tag label content',
    },
    disabled: {
      control: 'boolean',
      description: 'Disables the remove button',
    },
  },
};

export default meta;
type Story = StoryObj<typeof Tag>;

export const Default: Story = {
  args: {
    children: 'Furnished',
    variant: 'secondary',
    onRemove: fn(),
  },
};

export const ReadOnly: Story = {
  args: {
    children: 'No remove button',
    variant: 'neutral',
  },
};

export const Disabled: Story = {
  args: {
    children: 'Locked',
    variant: 'info',
    disabled: true,
    onRemove: fn(),
  },
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      {(
        [
          'default',
          'secondary',
          'destructive',
          'outline',
          'success',
          'warning',
          'info',
          'error',
          'neutral',
          'purple',
        ] as const
      ).map((variant) => (
        <Tag key={variant} variant={variant} onRemove={() => undefined}>
          {variant}
        </Tag>
      ))}
    </div>
  ),
};

function RemovableListDemo() {
  const [tags, setTags] = useState([
    'Lagos',
    '2 bedrooms',
    'Pet friendly',
    'Parking',
  ]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <Tag
            key={tag}
            variant="info"
            onRemove={() => setTags((prev) => prev.filter((t) => t !== tag))}
          >
            {tag}
          </Tag>
        ))}
      </div>
      {tags.length === 0 && (
        <p className="text-sm text-neutral-500">All filters cleared.</p>
      )}
    </div>
  );
}

export const RemovableList: Story = {
  render: () => <RemovableListDemo />,
};
