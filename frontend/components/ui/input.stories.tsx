import type { Meta, StoryObj } from '@storybook/react';
import { expect, fn, userEvent, within } from 'storybook/test';
import { Input } from './input';

const meta: Meta<typeof Input> = {
  title: 'UI/Input',
  component: Input,
  tags: ['autodocs'],
  argTypes: {
    type: {
      control: 'select',
      options: ['text', 'password', 'email', 'number', 'tel', 'url'],
      description: 'HTML input type',
    },
    placeholder: {
      control: 'text',
      description: 'Placeholder text',
    },
    disabled: {
      control: 'boolean',
      description: 'Whether the input is disabled',
    },
  },
};

export default meta;
type Story = StoryObj<typeof Input>;

export const Default: Story = {
  args: {
    placeholder: 'Enter text...',
    onChange: fn(),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByPlaceholderText('Enter text...');

    await userEvent.type(input, 'Lekki apartment');
    await expect(input).toHaveValue('Lekki apartment');
    await expect(args.onChange).toHaveBeenCalled();

    await userEvent.clear(input);
    await expect(input).toHaveValue('');
  },
};

export const WithValue: Story = {
  args: {
    value: 'Hello World',
  },
};

export const Password: Story = {
  args: {
    type: 'password',
    placeholder: 'Enter password...',
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
    placeholder: 'Disabled input',
    value: 'Cannot edit this',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByPlaceholderText('Disabled input');

    await expect(input).toBeDisabled();
    await userEvent.type(input, 'new text', { pointerEventsCheck: 0 });
    await expect(input).toHaveValue('Cannot edit this');
  },
};

export const WithLabel: Story = {
  render: () => (
    <div className="space-y-2">
      <label htmlFor="email" className="text-sm font-medium">
        Email
      </label>
      <Input id="email" type="email" placeholder="you@example.com" />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Clicking the label focuses the associated input
    await userEvent.click(canvas.getByText('Email'));
    await expect(canvas.getByLabelText('Email')).toHaveFocus();
  },
};

export const AllStates: Story = {
  render: () => (
    <div className="flex flex-col gap-4 w-72">
      <Input placeholder="Default input" />
      <Input placeholder="Disabled" disabled />
      <Input type="password" placeholder="Password field" />
      <Input type="email" placeholder="Email field" value="user@test.com" />
    </div>
  ),
};
