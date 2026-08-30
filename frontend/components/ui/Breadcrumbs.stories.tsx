import type { Meta, StoryObj } from '@storybook/react';
import { Breadcrumbs } from './Breadcrumbs';

const meta: Meta<typeof Breadcrumbs> = {
  title: 'UI/Breadcrumbs',
  component: Breadcrumbs,
  tags: ['autodocs'],
  argTypes: {
    homeHref: {
      control: 'text',
      description: 'URL for the home link',
    },
  },
};

export default meta;
type Story = StoryObj<typeof Breadcrumbs>;

export const Default: Story = {
  args: {
    items: [
      { label: 'Dashboard', href: '/dashboard' },
      { label: 'Properties', href: '/properties' },
      { label: 'Property Details' },
    ],
    homeHref: '/',
  },
};

export const SingleLevel: Story = {
  args: {
    items: [{ label: 'Dashboard' }],
    homeHref: '/',
  },
};

export const DeepNesting: Story = {
  args: {
    items: [
      { label: 'Admin', href: '/admin' },
      { label: 'Users', href: '/admin/users' },
      { label: 'Roles', href: '/admin/users/roles' },
      { label: 'Edit Role' },
    ],
    homeHref: '/',
  },
};

export const AllStates: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <Breadcrumbs
        items={[{ label: 'Home', href: '/' }, { label: 'Current Page' }]}
      />
      <Breadcrumbs
        items={[
          { label: 'Admin', href: '/admin' },
          { label: 'Settings', href: '/admin/settings' },
          { label: 'Profile' },
        ]}
      />
    </div>
  ),
};
