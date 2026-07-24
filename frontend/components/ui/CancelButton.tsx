'use client';

import React from 'react';
import { Button, type ButtonProps } from './button';

export interface CancelButtonProps extends Omit<
  ButtonProps,
  'onClick' | 'disabled' | 'variant' | 'children'
> {
  onCancel: () => void;
  label?: string;
  isInFlight?: boolean;
}

export function CancelButton({
  onCancel,
  label = 'Cancel',
  isInFlight = true,
  className,
  ...props
}: CancelButtonProps) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onCancel}
      disabled={!isInFlight}
      className={className}
      {...props}
    >
      <span className="inline-flex items-center gap-1.5">
        <span
          className="inline-block h-3 w-3 rounded-full border border-current"
          aria-hidden="true"
        />
        {label}
      </span>
    </Button>
  );
}
