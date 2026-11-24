import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-primary text-primary-foreground hover:bg-primary/80',
        secondary:
          'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
        destructive:
          'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80',
        outline: 'text-foreground',
        success:
          'border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300',
        warning:
          'border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300',
        info: 'border-blue-500/25 bg-blue-500/10 text-blue-600 dark:text-blue-300',
        error:
          'border-rose-500/25 bg-rose-500/10 text-rose-600 dark:text-rose-300',
        neutral:
          'border-slate-500/25 bg-slate-500/10 text-slate-600 dark:text-slate-300',
        purple:
          'border-violet-500/25 bg-violet-500/10 text-violet-600 dark:text-violet-300',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface BadgeProps
  extends
    React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

/**
 * Read-only status label. Use `Tag` when the user needs to remove the item.
 */
function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
