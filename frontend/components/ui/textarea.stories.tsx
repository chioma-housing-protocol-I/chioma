import type { Meta, StoryObj } from '@storybook/react';
import { Textarea } from './textarea';

const meta: Meta<typeof Textarea> = {
  title: 'UI/Textarea',
  component: Textarea,
  tags: ['autodocs'],
  argTypes: {
    placeholder: {
      control: 'text',
      description: 'Placeholder text',
    },
    disabled: {
      control: 'boolean',
      description: 'Whether the textarea is disabled',
    },
    rows: {
      control: 'number',
      description: 'Number of visible text rows',
    },
  },
};

export default meta;
type Story = StoryObj<typeof Textarea>;

export const Default: Story = {
  args: {
    placeholder: 'Type your message here...',
  },
};

export const WithValue: Story = {
  args: {
    value: 'This is a pre-filled textarea with some content.',
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
    placeholder: 'Disabled textarea',
    value: 'Cannot edit this content',
  },
};

export const WithLabel: Story = {
  render: () => (
    <div className="space-y-2">
      <label htmlFor="message" className="text-sm font-medium">
        Message
      </label>
      <Textarea id="message" placeholder="Enter your message..." />
    </div>
  ),
};

export const AllStates: Story = {
  render: () => (
    <div className="flex flex-col gap-4 w-80">
      <Textarea placeholder="Default textarea" />
      <Textarea placeholder="Disabled" disabled />
      <Textarea value="Pre-filled content" />
    </div>
  ),
};
