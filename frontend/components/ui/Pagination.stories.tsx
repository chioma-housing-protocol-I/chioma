import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { Pagination } from './Pagination';

function PaginationDemo({
  initialPage,
  totalPages,
}: {
  initialPage: number;
  totalPages: number;
}) {
  const [page, setPage] = useState(initialPage);
  return (
    <Pagination
      currentPage={page}
      totalPages={totalPages}
      onPageChange={setPage}
    />
  );
}

const meta: Meta<typeof Pagination> = {
  title: 'UI/Pagination',
  component: Pagination,
  tags: ['autodocs'],
  argTypes: {
    currentPage: {
      control: 'number',
      description: 'Currently active page number',
    },
    totalPages: {
      control: 'number',
      description: 'Total number of pages',
    },
  },
};

export default meta;
type Story = StoryObj<typeof Pagination>;

export const Default: Story = {
  render: () => <PaginationDemo initialPage={1} totalPages={10} />,
};

export const MiddlePage: Story = {
  render: () => <PaginationDemo initialPage={5} totalPages={20} />,
};

export const LastPage: Story = {
  render: () => <PaginationDemo initialPage={10} totalPages={10} />,
};

export const FewPages: Story = {
  render: () => <PaginationDemo initialPage={2} totalPages={5} />,
};

export const HiddenWhenSingle: Story = {
  render: () => (
    <p className="text-neutral-500">Pagination hidden (single page)</p>
  ),
};
