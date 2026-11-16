'use client';

import React, { useId, useState } from 'react';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
  /** Current number of items per page; required to show the page size selector. */
  pageSize?: number;
  /** Options offered in the items-per-page selector. */
  pageSizeOptions?: number[];
  /** Called when the user picks a new page size. Enables the selector. */
  onPageSizeChange?: (pageSize: number) => void;
  /** Show a "Go to page" input for jumping directly to a page. */
  showJumpToPage?: boolean;
}

const DEFAULT_PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

function buildPages(
  currentPage: number,
  totalPages: number,
): Array<number | '...'> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, idx) => idx + 1);
  }

  const pages: Array<number | '...'> = [1];
  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);

  if (start > 2) pages.push('...');
  for (let page = start; page <= end; page += 1) pages.push(page);
  if (end < totalPages - 1) pages.push('...');
  pages.push(totalPages);

  return pages;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  className = '',
  pageSize,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
  onPageSizeChange,
  showJumpToPage = false,
}: PaginationProps) {
  const baseId = useId();
  const [jumpValue, setJumpValue] = useState('');

  const showPageSize =
    pageSize !== undefined && onPageSizeChange !== undefined;

  if (totalPages <= 1 && !showPageSize) return null;

  const pages = buildPages(currentPage, totalPages);

  const handleJump = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const target = Number.parseInt(jumpValue, 10);
    if (Number.isNaN(target)) return;
    const clamped = Math.min(totalPages, Math.max(1, target));
    if (clamped !== currentPage) onPageChange(clamped);
    setJumpValue('');
  };

  const sizeOptions =
    pageSize !== undefined && !pageSizeOptions.includes(pageSize)
      ? [...pageSizeOptions, pageSize].sort((a, b) => a - b)
      : pageSizeOptions;

  return (
    <div
      className={`flex flex-wrap items-center justify-center gap-4 ${className}`}
    >
      {showPageSize && (
        <div className="flex items-center gap-2 text-sm text-neutral-700">
          <label htmlFor={`${baseId}-page-size`}>Items per page</label>
          <select
            id={`${baseId}-page-size`}
            value={pageSize}
            onChange={(event) =>
              onPageSizeChange?.(Number(event.target.value))
            }
            className="rounded-lg border border-neutral-200 bg-white px-2 py-2 text-sm font-medium text-neutral-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {sizeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      )}

      {totalPages > 1 && (
        <nav
          className="flex items-center justify-center gap-2"
          aria-label="Pagination"
        >
          <button
            type="button"
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Prev
          </button>

          {pages.map((page, idx) =>
            page === '...' ? (
              <span
                key={`ellipsis-${idx}`}
                className="px-1 text-neutral-500"
              >
                ...
              </span>
            ) : (
              <button
                key={page}
                type="button"
                onClick={() => onPageChange(page)}
                aria-current={page === currentPage ? 'page' : undefined}
                className={`h-9 min-w-9 rounded-lg px-2 text-sm font-medium transition ${
                  page === currentPage
                    ? 'bg-blue-600 text-white'
                    : 'border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50'
                }`}
              >
                {page}
              </button>
            ),
          )}

          <button
            type="button"
            onClick={() =>
              onPageChange(Math.min(totalPages, currentPage + 1))
            }
            disabled={currentPage === totalPages}
            className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
          </button>
        </nav>
      )}

      {showJumpToPage && totalPages > 1 && (
        <form
          onSubmit={handleJump}
          className="flex items-center gap-2 text-sm text-neutral-700"
        >
          <label htmlFor={`${baseId}-jump`}>Go to page</label>
          <input
            id={`${baseId}-jump`}
            type="number"
            inputMode="numeric"
            min={1}
            max={totalPages}
            value={jumpValue}
            onChange={(event) => setJumpValue(event.target.value)}
            placeholder={String(currentPage)}
            className="h-9 w-16 rounded-lg border border-neutral-200 bg-white px-2 text-sm text-neutral-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={!jumpValue}
            className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Go
          </button>
        </form>
      )}
    </div>
  );
}
