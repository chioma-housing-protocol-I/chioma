import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { expect, userEvent, within } from 'storybook/test';
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
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const prev = canvas.getByRole('button', { name: 'Prev' });
    const next = canvas.getByRole('button', { name: 'Next' });

    await expect(prev).toBeDisabled();
    await expect(canvas.getByRole('button', { name: '1' })).toHaveAttribute(
      'aria-current',
      'page',
    );

    await userEvent.click(next);
    await expect(canvas.getByRole('button', { name: '2' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    await expect(prev).toBeEnabled();

    await userEvent.click(canvas.getByRole('button', { name: '10' }));
    await expect(canvas.getByRole('button', { name: '10' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    await expect(next).toBeDisabled();

    await userEvent.click(prev);
    await expect(canvas.getByRole('button', { name: '9' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  },
};

export const MiddlePage: Story = {
  render: () => <PaginationDemo initialPage={5} totalPages={20} />,
};

export const LastPage: Story = {
  render: () => <PaginationDemo initialPage={10} totalPages={10} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('button', { name: 'Next' })).toBeDisabled();
    await expect(canvas.getByRole('button', { name: 'Prev' })).toBeEnabled();
  },
};

export const FewPages: Story = {
  render: () => <PaginationDemo initialPage={2} totalPages={5} />,
};

function FullFeaturedDemo() {
  const totalItems = 487;
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const totalPages = Math.ceil(totalItems / pageSize);
  return (
    <Pagination
      currentPage={page}
      totalPages={totalPages}
      onPageChange={setPage}
      pageSize={pageSize}
      onPageSizeChange={(size) => {
        setPageSize(size);
        setPage(1);
      }}
      showJumpToPage
    />
  );
}

export const WithPageSizeAndJump: Story = {
  render: () => <FullFeaturedDemo />,
};

export const HiddenWhenSingle: Story = {
  render: () => (
    <p className="text-neutral-500">Pagination hidden (single page)</p>
  ),
};
