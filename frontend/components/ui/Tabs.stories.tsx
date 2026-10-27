import type { Meta, StoryObj } from '@storybook/react';
import { Tabs, type TabItem } from './Tabs';

const tabs: TabItem[] = [
  { id: 'overview', label: 'Overview', content: <p>Property overview</p> },
  { id: 'amenities', label: 'Amenities', content: <p>Amenities list</p> },
  { id: 'reviews', label: 'Reviews', content: <p>Tenant reviews</p> },
  {
    id: 'documents',
    label: 'Documents',
    content: <p>Lease documents</p>,
    disabled: true,
  },
  { id: 'location', label: 'Location', content: <p>Map and directions</p> },
];

const meta: Meta<typeof Tabs> = {
  title: 'UI/Tabs',
  component: Tabs,
  tags: ['autodocs'],
  args: { tabs, ariaLabel: 'Property details' },
  argTypes: {
    activationMode: {
      control: 'radio',
      options: ['automatic', 'manual'],
      description: 'Whether arrow-key focus also activates the tab',
    },
    orientation: {
      control: 'radio',
      options: ['horizontal', 'vertical'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Tabs>;

export const Default: Story = {};

export const ManualActivation: Story = {
  args: { activationMode: 'manual' },
};

export const Vertical: Story = {
  args: { orientation: 'vertical' },
};
