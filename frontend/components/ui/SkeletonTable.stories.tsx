import type { Meta, StoryObj } from '@storybook/react';
import { SkeletonTable } from './SkeletonTable';

const meta: Meta<typeof SkeletonTable> = {
  title: 'UI/SkeletonTable',
  component: SkeletonTable,
  tags: ['autodocs'],
  argTypes: {
    rows: {
      control: 'number',
      description: 'Number of skeleton rows to display',
    },
  },
};

export default meta;
type Story = StoryObj<typeof SkeletonTable>;

export const Default: Story = {
  args: {
    rows: 5,
  },
};

export const FewRows: Story = {
  args: {
    rows: 3,
  },
};

export const ManyRows: Story = {
  args: {
    rows: 10,
  },
};

export const AllSizes: Story = {
  render: () => (
    <div className="flex flex-col gap-8 w-full max-w-2xl">
      <div>
        <h3 className="text-sm font-medium mb-2">3 rows</h3>
        <SkeletonTable rows={3} />
      </div>
      <div>
        <h3 className="text-sm font-medium mb-2">5 rows</h3>
        <SkeletonTable rows={5} />
      </div>
      <div>
        <h3 className="text-sm font-medium mb-2">8 rows</h3>
        <SkeletonTable rows={8} />
      </div>
    </div>
  ),
};
