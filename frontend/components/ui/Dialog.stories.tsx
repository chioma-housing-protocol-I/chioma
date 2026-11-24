import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import { AlertDialog, ConfirmDialog, Drawer, Modal } from './Dialog';

/**
 * Dialog variants share one API: `isOpen`, `onClose`, `title`,
 * `description`, `children`, `footer`, `showCloseButton`,
 * `closeOnOverlayClick` and `closeOnEscape`.
 *
 * The `play` functions double as accessibility checks: they assert the
 * correct role, accessible name/description, initial focus, and keyboard
 * dismissal for each variant.
 */
const meta: Meta<typeof Modal> = {
  title: 'UI/Dialog',
  component: Modal,
  tags: ['autodocs'],
  args: {
    onClose: fn(),
  },
  decorators: [
    (Story) => (
      <div className="relative min-h-[320px]">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof Modal>;

export const BasicModal: Story = {
  args: {
    isOpen: true,
    title: 'Property details',
    description: 'Review the listing before publishing it.',
    size: 'md',
    children: (
      <p>
        Three-bedroom apartment in Lekki Phase 1 with 24/7 power and a
        dedicated parking space.
      </p>
    ),
  },
  play: async ({ canvasElement, args }) => {
    const screen = within(canvasElement.ownerDocument.body);
    const dialog = await screen.findByRole('dialog', {
      name: 'Property details',
    });

    await expect(dialog).toHaveAttribute('aria-modal', 'true');
    await expect(dialog).toHaveAccessibleDescription(
      'Review the listing before publishing it.',
    );

    await userEvent.keyboard('{Escape}');
    await expect(args.onClose).toHaveBeenCalled();
  },
};

export const ModalWithFooter: Story = {
  args: {
    isOpen: true,
    title: 'Edit profile',
    children: <p>Form fields go here.</p>,
    footer: (
      <div className="flex justify-end gap-2">
        <button
          type="button"
          className="rounded-lg border border-neutral-200 px-4 py-2 text-sm font-semibold"
        >
          Cancel
        </button>
        <button
          type="button"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
        >
          Save
        </button>
      </div>
    ),
  },
};

export const Alert: StoryObj<typeof AlertDialog> = {
  render: (args) => <AlertDialog {...args} />,
  args: {
    isOpen: true,
    tone: 'warning',
    title: 'Session expiring',
    description: 'You will be signed out in 2 minutes due to inactivity.',
    actionLabel: 'Got it',
    onClose: fn(),
  },
  play: async ({ canvasElement, args }) => {
    const screen = within(canvasElement.ownerDocument.body);
    const dialog = await screen.findByRole('alertdialog', {
      name: 'Session expiring',
    });
    const action = within(dialog).getByRole('button', { name: 'Got it' });

    // Focus moves straight to the only action.
    await waitFor(() => expect(action).toHaveFocus());

    await userEvent.click(action);
    await expect(args.onClose).toHaveBeenCalledTimes(1);
  },
};

export const AlertTones: StoryObj<typeof AlertDialog> = {
  render: () => {
    function Demo() {
      const [tone, setTone] = useState<
        'info' | 'success' | 'warning' | 'danger' | null
      >(null);
      return (
        <div className="flex gap-2">
          {(['info', 'success', 'warning', 'danger'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTone(t)}
              className="rounded-lg border border-neutral-200 px-3 py-2 text-sm capitalize"
            >
              {t}
            </button>
          ))}
          <AlertDialog
            isOpen={tone !== null}
            tone={tone ?? 'info'}
            title={`${tone ?? 'info'} alert`}
            description="This is how each alert tone looks."
            onClose={() => setTone(null)}
          />
        </div>
      );
    }
    return <Demo />;
  },
};

export const Confirm: StoryObj<typeof ConfirmDialog> = {
  render: (args) => <ConfirmDialog {...args} />,
  args: {
    isOpen: true,
    tone: 'danger',
    title: 'Delete property',
    description: 'This action cannot be undone.',
    confirmLabel: 'Delete',
    onCancel: fn(),
    onConfirm: fn(),
  },
  play: async ({ canvasElement, args }) => {
    const screen = within(canvasElement.ownerDocument.body);
    const dialog = await screen.findByRole('dialog', {
      name: 'Delete property',
    });
    const cancel = within(dialog).getByRole('button', { name: 'Cancel' });

    // Safe default: Cancel is focused, not the destructive action.
    await waitFor(() => expect(cancel).toHaveFocus());

    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Delete' }),
    );
    await expect(args.onConfirm).toHaveBeenCalledTimes(1);
  },
};

export const ConfirmLoading: StoryObj<typeof ConfirmDialog> = {
  render: (args) => <ConfirmDialog {...args} />,
  args: {
    isOpen: true,
    title: 'Submitting payment',
    description: 'Please keep this window open.',
    loading: true,
    onCancel: fn(),
    onConfirm: fn(),
  },
  play: async ({ canvasElement, args }) => {
    const screen = within(canvasElement.ownerDocument.body);
    const dialog = await screen.findByRole('dialog');

    await userEvent.keyboard('{Escape}');
    await expect(args.onCancel).not.toHaveBeenCalled();
    await expect(
      within(dialog).getByRole('button', { name: 'Please wait...' }),
    ).toBeDisabled();
  },
};

export const RightDrawer: StoryObj<typeof Drawer> = {
  render: (args) => <Drawer {...args} />,
  args: {
    isOpen: true,
    side: 'right',
    title: 'Filters',
    description: 'Narrow down listings.',
    children: <p>Price, bedrooms and amenities filters.</p>,
    onClose: fn(),
  },
  play: async ({ canvasElement, args }) => {
    const screen = within(canvasElement.ownerDocument.body);
    const dialog = await screen.findByRole('dialog', { name: 'Filters' });

    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Close drawer' }),
    );
    await expect(args.onClose).toHaveBeenCalled();
  },
};

export const LeftDrawer: StoryObj<typeof Drawer> = {
  render: (args) => <Drawer {...args} />,
  args: {
    isOpen: true,
    side: 'left',
    title: 'Navigation',
    children: <p>Secondary navigation links.</p>,
    onClose: fn(),
  },
};

export const Interactive: Story = {
  render: () => {
    function Demo() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
          >
            Open modal
          </button>
          <Modal
            isOpen={open}
            onClose={() => setOpen(false)}
            title="Interactive modal"
          >
            <p>Press Escape or the close button to dismiss.</p>
          </Modal>
        </>
      );
    }
    return <Demo />;
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const screen = within(canvasElement.ownerDocument.body);
    const trigger = canvas.getByRole('button', { name: 'Open modal' });

    await userEvent.click(trigger);
    await screen.findByRole('dialog', { name: 'Interactive modal' });

    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());

    // Focus is restored to the trigger after closing.
    await waitFor(() => expect(trigger).toHaveFocus());
  },
};
