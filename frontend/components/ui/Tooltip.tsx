'use client';

import React from 'react';

export interface TooltipProps {
  content: string;
  children: React.ReactNode;
  side?: 'top' | 'bottom';
}

export function Tooltip({ content, children, side = 'top' }: TooltipProps) {
  const sideClass =
    side === 'bottom'
      ? 'top-full mt-2 left-1/2 -translate-x-1/2'
      : 'bottom-full mb-2 left-1/2 -translate-x-1/2';

  return (
    <span className="group relative inline-flex">
      {children}
      <span
        role="tooltip"
        className={`pointer-events-none absolute z-20 w-max max-w-xs rounded-md bg-neutral-900 px-2 py-1 text-xs text-white opacity-0 shadow-md transition group-hover:opacity-100 group-focus-within:opacity-100 ${sideClass}`}
      >
        {content}
      </span>
    </span>
  );
}
