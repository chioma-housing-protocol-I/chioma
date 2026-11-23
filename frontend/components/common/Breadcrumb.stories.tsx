import type { Meta, StoryObj } from '@storybook/react';
import { Breadcrumb } from './Breadcrumb';

const meta: Meta<typeof Breadcrumb> = {
  title: 'Common/Breadcrumb',
  component: Breadcrumb,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Breadcrumb>;

export const Default: Story = {
  args: {
    items: [
      { label: 'Properties', href: '/properties' },
      { label: 'Victoria Island Apartment', isCurrent: true },
    ],
    backHref: '/properties',
    backLabel: 'Back to properties',
  },
};

export const DeepHierarchy: Story = {
  args: {
    items: [
      { label: 'Dashboard', href: '/user' },
      { label: 'Financials', href: '/user/financials' },
      { label: 'Escrows', href: '/user/financials/escrows' },
      { label: 'Deposit #ESC-4029', isCurrent: true },
    ],
    backHref: '/user/financials/escrows',
    backLabel: 'Back to escrows',
  },
};

export const WithoutBackButton: Story = {
  args: {
    items: [
      { label: 'Guest Portal', href: '/guest' },
      { label: 'Trips', isCurrent: true },
    ],
    showBackButton: false,
  },
};

export const LightVariant: Story = {
  args: {
    variant: 'light',
    items: [
      { label: 'Stays', href: '/stays' },
      { label: 'Lekki Beachfront Villa', isCurrent: true },
    ],
    backHref: '/stays',
    backLabel: 'Back to stays',
  },
};
