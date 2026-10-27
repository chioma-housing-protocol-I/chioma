import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
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
  args: {
    onCancel: fn(),
    onConfirm: fn(),
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
  play: async ({ canvasElement, args }) => {
    // The dialog renders in a portal outside the story canvas
    const screen = within(canvasElement.ownerDocument.body);
    const dialog = await screen.findByRole('dialog');

    await expect(within(dialog).getByText('Confirm Action')).toBeVisible();

    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Confirm' }),
    );
    await expect(args.onConfirm).toHaveBeenCalledTimes(1);

    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Cancel' }),
    );
    await expect(args.onCancel).toHaveBeenCalled();
  },
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
  play: async ({ canvasElement, args }) => {
    const screen = within(canvasElement.ownerDocument.body);
    const dialog = await screen.findByRole('dialog');

    const confirm = within(dialog).getByRole('button', {
      name: 'Please wait...',
    });
    const cancel = within(dialog).getByRole('button', { name: 'Cancel' });

    await expect(confirm).toBeDisabled();
    await expect(cancel).toBeDisabled();
    await userEvent.click(confirm, { pointerEventsCheck: 0 });
    await expect(args.onConfirm).not.toHaveBeenCalled();
  },
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
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const screen = within(canvasElement.ownerDocument.body);

    // Opening the dialog
    await userEvent.click(canvas.getByRole('button', { name: 'Open Dialog' }));
    const dialog = await screen.findByRole('dialog');
    await expect(
      within(dialog).getByText('Are you sure you want to proceed?'),
    ).toBeVisible();

    // Cancelling closes it
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'No, cancel' }),
    );
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());

    // Re-opening and confirming also closes it
    await userEvent.click(canvas.getByRole('button', { name: 'Open Dialog' }));
    const reopened = await screen.findByRole('dialog');
    await userEvent.click(
      within(reopened).getByRole('button', { name: 'Yes, proceed' }),
    );
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  },
};
