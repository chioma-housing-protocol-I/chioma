import type { Meta, StoryObj } from '@storybook/react';
import { StarRating } from '../common/StarRating';

const meta: Meta<typeof StarRating> = {
  title: 'UI/StarRating',
  component: StarRating,
  tags: ['autodocs'],
  argTypes: {
    value: {
      control: { type: 'range', min: 0, max: 5, step: 1 },
      description: 'Current rating value (0-5)',
    },
    readonly: {
      control: 'boolean',
      description: 'Whether the rating is read-only',
    },
    size: {
      control: 'number',
      description: 'Size of the star icons in pixels',
    },
  },
};

export default meta;
type Story = StoryObj<typeof StarRating>;

export const Default: Story = {
  args: {
    value: 3,
    readonly: false,
    size: 20,
  },
};

export const ReadOnly: Story = {
  args: {
    value: 4,
    readonly: true,
    size: 20,
  },
};

export const Empty: Story = {
  args: {
    value: 0,
    readonly: false,
    size: 20,
  },
};

export const Full: Story = {
  args: {
    value: 5,
    readonly: true,
    size: 24,
  },
};

export const Small: Story = {
  args: {
    value: 3,
    readonly: true,
    size: 14,
  },
};

export const AllStates: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <StarRating value={0} readonly size={20} />
      <StarRating value={1} readonly size={20} />
      <StarRating value={2} readonly size={20} />
      <StarRating value={3} readonly size={20} />
      <StarRating value={4} readonly size={20} />
      <StarRating value={5} readonly size={20} />
    </div>
  ),
};
