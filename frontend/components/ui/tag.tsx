import * as React from 'react';
import { X } from 'lucide-react';
import { type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';
import { badgeVariants } from './badge';

export interface TagProps
  extends
    Omit<React.HTMLAttributes<HTMLSpanElement>, 'children'>,
    VariantProps<typeof badgeVariants> {
  /** Visible label of the tag. */
  children: React.ReactNode;
  /**
   * Called when the remove button is clicked, or when Backspace/Delete is
   * pressed while the tag has focus. When omitted the remove button is hidden.
   */
  onRemove?: () => void;
  /** Accessible label for the remove button. Defaults to `Remove <label>`. */
  removeLabel?: string;
  /** Disables the remove button. */
  disabled?: boolean;
}

/**
 * Removable label, e.g. for selected filters or amenities.
 * Shares color variants with `Badge`.
 */
function Tag({
  className,
  variant = 'secondary',
  children,
  onRemove,
  removeLabel,
  disabled = false,
  onKeyDown,
  ...props
}: TagProps) {
  const label =
    removeLabel ?? `Remove ${typeof children === 'string' ? children : 'tag'}`;

  const handleKeyDown = (event: React.KeyboardEvent<HTMLSpanElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented || disabled || !onRemove) return;
    if (event.key === 'Backspace' || event.key === 'Delete') {
      event.preventDefault();
      onRemove();
    }
  };

  return (
    <span
      className={cn(
        badgeVariants({ variant }),
        'gap-1',
        onRemove && 'pr-1',
        disabled && 'opacity-50',
        className,
      )}
      onKeyDown={handleKeyDown}
      {...props}
    >
      <span className="truncate">{children}</span>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          disabled={disabled}
          aria-label={label}
          className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-black/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-current disabled:cursor-not-allowed dark:hover:bg-white/10"
        >
          <X className="h-3 w-3" aria-hidden="true" />
        </button>
      )}
    </span>
  );
}

export { Tag };
