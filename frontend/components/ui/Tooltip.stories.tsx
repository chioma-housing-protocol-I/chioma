import type { Meta, StoryObj } from '@storybook/react';
import { Tooltip } from './Tooltip';
import { Button } from './button';

const meta: Meta<typeof Tooltip> = {
  title: 'UI/Tooltip',
  component: Tooltip,
  tags: ['autodocs'],
  argTypes: {
    content: {
      control: 'text',
      description: 'Tooltip text content',
    },
    side: {
      control: 'select',
      options: ['top', 'bottom'],
      description: 'Position of the tooltip relative to the trigger',
    },
  },
};

export default meta;
type Story = StoryObj<typeof Tooltip>;

export const Default: Story = {
  args: {
    content: 'This is a tooltip',
    side: 'top',
  },
  render: (args) => (
    <Tooltip {...args}>
      <Button>Hover me</Button>
    </Tooltip>
  ),
};

export const Bottom: Story = {
  args: {
    content: 'Tooltip on bottom',
    side: 'bottom',
  },
  render: (args) => (
    <Tooltip {...args}>
      <Button>Hover me</Button>
    </Tooltip>
  ),
};

export const WithIcon: Story = {
  render: () => (
    <Tooltip content="More information">
      <button className="h-8 w-8 rounded-full bg-neutral-200 flex items-center justify-center text-sm font-bold">
        ?
      </button>
    </Tooltip>
  ),
};

export const BothPositions: Story = {
  render: () => (
    <div className="flex gap-8">
      <Tooltip content="Tooltip on top" side="top">
        <Button variant="outline">Top</Button>
      </Tooltip>
      <Tooltip content="Tooltip on bottom" side="bottom">
        <Button variant="outline">Bottom</Button>
      </Tooltip>
    </div>
  ),
};
