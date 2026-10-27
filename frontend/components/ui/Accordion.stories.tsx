import type { Meta, StoryObj } from '@storybook/react';
import { expect, fn, userEvent, within } from 'storybook/test';
import { Accordion, AccordionItem } from './Accordion';

const faqItems = [
  {
    value: 'deposit',
    title: 'How is my security deposit protected?',
    content:
      'Deposits are held in an on-chain escrow and released according to the lease terms.',
  },
  {
    value: 'payments',
    title: 'Which tokens can I pay rent with?',
    content: 'Any token supported by the protocol, such as USDC or XLM.',
  },
  {
    value: 'disputes',
    title: 'What happens if there is a dispute?',
    content:
      'Independent arbiters vote on the dispute and the outcome is final.',
  },
];

const meta: Meta<typeof Accordion> = {
  title: 'UI/Accordion',
  component: Accordion,
  tags: ['autodocs'],
  argTypes: {
    type: {
      control: 'select',
      options: ['single', 'multiple'],
      description: 'Whether one or many items can be open at the same time',
    },
    collapsible: {
      control: 'boolean',
      description:
        'In single mode, allow closing the open item by clicking it again',
    },
    defaultValue: {
      control: 'object',
      description: 'Item values that are open initially',
    },
  },
  args: {
    onValueChange: fn(),
  },
  render: (args) => (
    <div className="w-[420px]">
      <Accordion {...args}>
        {faqItems.map((item) => (
          <AccordionItem key={item.value} value={item.value} title={item.title}>
            {item.content}
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  ),
};

export default meta;
type Story = StoryObj<typeof Accordion>;

export const Single: Story = {
  args: {
    type: 'single',
    collapsible: true,
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const deposit = canvas.getByRole('button', { name: faqItems[0].title });
    const payments = canvas.getByRole('button', { name: faqItems[1].title });

    await expect(deposit).toHaveAttribute('aria-expanded', 'false');

    await userEvent.click(deposit);
    await expect(deposit).toHaveAttribute('aria-expanded', 'true');
    await expect(canvas.getByText(faqItems[0].content)).toBeVisible();
    await expect(args.onValueChange).toHaveBeenLastCalledWith(['deposit']);

    // Opening another item closes the previous one
    await userEvent.click(payments);
    await expect(payments).toHaveAttribute('aria-expanded', 'true');
    await expect(deposit).toHaveAttribute('aria-expanded', 'false');
    await expect(canvas.getByText(faqItems[0].content)).not.toBeVisible();

    // Clicking the open item again collapses it
    await userEvent.click(payments);
    await expect(payments).toHaveAttribute('aria-expanded', 'false');
    await expect(args.onValueChange).toHaveBeenLastCalledWith([]);
  },
};

export const Multiple: Story = {
  args: {
    type: 'multiple',
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const deposit = canvas.getByRole('button', { name: faqItems[0].title });
    const disputes = canvas.getByRole('button', { name: faqItems[2].title });

    await userEvent.click(deposit);
    await userEvent.click(disputes);

    // Both items stay open
    await expect(deposit).toHaveAttribute('aria-expanded', 'true');
    await expect(disputes).toHaveAttribute('aria-expanded', 'true');
    await expect(args.onValueChange).toHaveBeenLastCalledWith([
      'deposit',
      'disputes',
    ]);

    await userEvent.click(deposit);
    await expect(deposit).toHaveAttribute('aria-expanded', 'false');
    await expect(disputes).toHaveAttribute('aria-expanded', 'true');
  },
};

export const DefaultOpen: Story = {
  args: {
    type: 'single',
    defaultValue: ['payments'],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole('button', { name: faqItems[1].title }),
    ).toHaveAttribute('aria-expanded', 'true');
    await expect(canvas.getByText(faqItems[1].content)).toBeVisible();
  },
};

export const NonCollapsible: Story = {
  args: {
    type: 'single',
    collapsible: false,
    defaultValue: ['deposit'],
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const deposit = canvas.getByRole('button', { name: faqItems[0].title });

    // The only open item cannot be closed
    await userEvent.click(deposit);
    await expect(deposit).toHaveAttribute('aria-expanded', 'true');
    await expect(args.onValueChange).not.toHaveBeenCalled();
  },
};

export const KeyboardNavigation: Story = {
  args: {
    type: 'single',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const deposit = canvas.getByRole('button', { name: faqItems[0].title });

    await userEvent.tab();
    await expect(deposit).toHaveFocus();

    await userEvent.keyboard('{Enter}');
    await expect(deposit).toHaveAttribute('aria-expanded', 'true');

    await userEvent.keyboard(' ');
    await expect(deposit).toHaveAttribute('aria-expanded', 'false');
  },
};

export const WithDisabledItem: Story = {
  render: (args) => (
    <div className="w-[420px]">
      <Accordion {...args}>
        <AccordionItem value="available" title="Available section">
          This section can be opened.
        </AccordionItem>
        <AccordionItem value="locked" title="Locked section" disabled>
          This section is disabled.
        </AccordionItem>
      </Accordion>
    </div>
  ),
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const locked = canvas.getByRole('button', { name: 'Locked section' });

    await expect(locked).toBeDisabled();
    await userEvent.click(locked, { pointerEventsCheck: 0 });
    await expect(locked).toHaveAttribute('aria-expanded', 'false');
    await expect(args.onValueChange).not.toHaveBeenCalled();
  },
};
