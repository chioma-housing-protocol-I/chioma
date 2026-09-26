import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { ConfirmDialog } from './ConfirmDialog';

const meta: Meta<typeof ConfirmDialog> = {
  title: 'UI/ConfirmDialog',
  component: ConfirmDialog,
  tags: ['autodocs'],
  argTypes: {
    title: {
      control: 'text',
      description: 'Dialog title',
    },
    description: {
      control: 'text',
      description: 'Dialog description text',
    },
    confirmLabel: {
      control: 'text',
      description: 'Label for the confirm button',
    },
    cancelLabel: {
      control: 'text',
      description: 'Label for the cancel button',
    },
    tone: {
      control: 'select',
      options: ['primary', 'danger'],
      description: 'Tone of the dialog (affects confirm button color)',
    },
    loading: {
      control: 'boolean',
      description: 'Whether the dialog is in a loading state',
    },
    isOpen: {
      control: 'boolean',
      description: 'Whether the dialog is visible',
    },
  },
};

export default meta;
type Story = StoryObj<typeof ConfirmDialog>;

export const Default: Story = {
  args: {
    isOpen: true,
    title: 'Confirm Action',
    description: 'Are you sure you want to proceed with this action?',
    confirmLabel: 'Confirm',
    cancelLabel: 'Cancel',
    tone: 'primary',
    loading: false,
  },
  decorators: [
    (Story) => (
      <div className="relative min-h-[300px]">
        <Story />
      </div>
    ),
  ],
};

export const Danger: Story = {
  args: {
    isOpen: true,
    title: 'Delete Property',
    description:
      'This action cannot be undone. All data will be permanently removed.',
    confirmLabel: 'Delete',
    cancelLabel: 'Cancel',
    tone: 'danger',
    loading: false,
  },
  decorators: [
    (Story) => (
      <div className="relative min-h-[300px]">
        <Story />
      </div>
    ),
  ],
};

export const Loading: Story = {
  args: {
    isOpen: true,
    title: 'Processing',
    description: 'Please wait while we process your request.',
    confirmLabel: 'Submit',
    cancelLabel: 'Cancel',
    tone: 'primary',
    loading: true,
  },
  decorators: [
    (Story) => (
      <div className="relative min-h-[300px]">
        <Story />
      </div>
    ),
  ],
};

export const Interactive: Story = {
  render: () => {
    function DialogDemo() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button
            onClick={() => setOpen(true)}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
          >
            Open Dialog
          </button>
          <ConfirmDialog
            isOpen={open}
            title="Confirm Action"
            description="Are you sure you want to proceed?"
            confirmLabel="Yes, proceed"
            cancelLabel="No, cancel"
            tone="primary"
            onCancel={() => setOpen(false)}
            onConfirm={() => setOpen(false)}
          />
        </>
      );
    }
    return <DialogDemo />;
  },
};
