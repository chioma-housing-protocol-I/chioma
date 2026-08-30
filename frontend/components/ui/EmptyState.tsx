import React from 'react';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
  variant?: 'default' | 'dark';
}

export const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
  (
    {
      icon: Icon,
      title,
      description,
      actionLabel,
      onAction,
      className = '',
      variant = 'default',
    },
    ref,
  ) => {
    const isDark = variant === 'dark';

    return (
      <div
        ref={ref}
        className={`flex flex-col items-center justify-center rounded-3xl border-2 border-dashed p-12 text-center ${
          isDark
            ? 'border-white/10 bg-white/5'
            : 'border-neutral-200 bg-neutral-50'
        } ${className}`}
      >
        {Icon && (
          <div
            className={`mb-6 rounded-2xl ${
              isDark ? 'bg-blue-500/10 p-4' : 'bg-blue-50 p-4'
            }`}
          >
            <Icon
              className={isDark ? 'text-blue-400' : 'text-blue-500'}
              size={48}
            />
          </div>
        )}
        <h3
          className={`text-xl font-bold mb-2 ${
            isDark ? 'text-white' : 'text-neutral-900'
          }`}
        >
          {title}
        </h3>
        <p
          className={`mb-6 max-w-md ${
            isDark ? 'text-blue-200/50' : 'text-neutral-500'
          }`}
        >
          {description}
        </p>
        {actionLabel && onAction && (
          <button
            onClick={onAction}
            className={`inline-flex items-center justify-center space-x-2 px-6 py-3 font-semibold rounded-xl transition-all shadow-lg ${
              isDark
                ? 'bg-blue-600/20 border border-blue-500/30 text-blue-400 hover:bg-blue-600 hover:text-white'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            <span>{actionLabel}</span>
          </button>
        )}
      </div>
    );
  },
);
EmptyState.displayName = 'EmptyState';
