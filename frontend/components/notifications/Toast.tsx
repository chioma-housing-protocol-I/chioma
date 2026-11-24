'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  X,
} from 'lucide-react';
import { useUIStore, type Toast as UIStoreToast } from '@/store/ui-store';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export type ToastPosition =
  | 'bottom-right'
  | 'bottom-left'
  | 'top-right'
  | 'top-left'
  | 'top-center'
  | 'bottom-center';

export interface ToastItemData {
  id: string;
  type?: ToastType;
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export interface ToastProps {
  id?: string;
  type?: ToastType;
  title: string;
  message?: string;
  duration?: number; // in milliseconds, default 4000 (4s)
  onDismiss?: (id: string) => void;
  action?: {
    label: string;
    onClick: () => void;
  };
  pauseOnHover?: boolean;
  className?: string;
}

/** Options accepted by the imperative `toast.*` helpers. */
export interface ToastOptions {
  /** Auto-dismiss delay in ms. Use `0` or `Infinity` to keep the toast open. */
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const DEFAULT_TOAST_DURATION = 4000;

export interface ToastContainerProps {
  toasts?: ToastItemData[];
  onDismiss?: (id: string) => void;
  position?: ToastPosition;
  maxToasts?: number;
  duration?: number;
  pauseOnHover?: boolean;
  className?: string;
}

const TYPE_CONFIG: Record<
  ToastType,
  {
    icon: React.ComponentType<{ className?: string }>;
    iconColor: string;
    borderColor: string;
    bgColor: string;
    badgeColor: string;
  }
> = {
  success: {
    icon: CheckCircle2,
    iconColor: 'text-emerald-400',
    borderColor: 'border-emerald-500/25',
    bgColor: 'bg-emerald-950/40',
    badgeColor: 'bg-emerald-500/10 text-emerald-300',
  },
  error: {
    icon: AlertCircle,
    iconColor: 'text-rose-400',
    borderColor: 'border-rose-500/25',
    bgColor: 'bg-rose-950/40',
    badgeColor: 'bg-rose-500/10 text-rose-300',
  },
  warning: {
    icon: AlertTriangle,
    iconColor: 'text-amber-400',
    borderColor: 'border-amber-500/25',
    bgColor: 'bg-amber-950/40',
    badgeColor: 'bg-amber-500/10 text-amber-300',
  },
  info: {
    icon: Info,
    iconColor: 'text-blue-400',
    borderColor: 'border-blue-500/25',
    bgColor: 'bg-blue-950/40',
    badgeColor: 'bg-blue-500/10 text-blue-300',
  },
};

const POSITION_STYLES: Record<ToastPosition, string> = {
  'bottom-right': 'bottom-5 right-5 items-end',
  'bottom-left': 'bottom-5 left-5 items-start',
  'top-right': 'top-5 right-5 items-end',
  'top-left': 'top-5 left-5 items-start',
  'top-center': 'top-5 left-1/2 -translate-x-1/2 items-center',
  'bottom-center': 'bottom-5 left-1/2 -translate-x-1/2 items-center',
};

/**
 * Individual Toast notification item.
 * Supports auto-dismiss after 4s, pause on hover, action button, and accessibility.
 */
export function ToastItem({
  id = 'toast-item',
  type = 'info',
  title,
  message,
  duration = 4000,
  onDismiss,
  action,
  pauseOnHover = true,
  className = '',
}: ToastProps) {
  const [isDismissing, setIsDismissing] = useState(false);
  const [remainingTime, setRemainingTime] = useState(duration);
  const [isPaused, setIsPaused] = useState(false);
  const startTimeRef = useRef<number>(Date.now());
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const handleDismiss = useCallback(() => {
    setIsDismissing(true);
    // Allow brief exit transition before removing
    setTimeout(() => {
      onDismiss?.(id);
    }, 150);
  }, [id, onDismiss]);

  // Manage auto-dismiss timer
  useEffect(() => {
    if (duration <= 0 || duration === Infinity) return;

    if (!isPaused) {
      startTimeRef.current = Date.now();
      timerRef.current = setTimeout(() => {
        handleDismiss();
      }, remainingTime);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [duration, remainingTime, isPaused, handleDismiss]);

  const isPersistent = duration <= 0 || duration === Infinity;

  const pauseTimer = () => {
    if (!pauseOnHover || isPersistent || isPaused) return;
    setIsPaused(true);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    const elapsed = Date.now() - startTimeRef.current;
    setRemainingTime((prev) => Math.max(prev - elapsed, 500));
  };

  const resumeTimer = () => {
    if (!pauseOnHover || isPersistent) return;
    setIsPaused(false);
  };

  // Resume only when focus leaves the toast entirely (not when it moves
  // between the action and dismiss buttons).
  const handleBlur = (event: React.FocusEvent<HTMLDivElement>) => {
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
      return;
    }
    resumeTimer();
  };

  const config = TYPE_CONFIG[type] || TYPE_CONFIG.info;
  const Icon = config.icon;
  const isError = type === 'error';

  return (
    <div
      role={isError ? 'alert' : 'status'}
      aria-live={isError ? 'assertive' : 'polite'}
      aria-atomic="true"
      onMouseEnter={pauseTimer}
      onMouseLeave={resumeTimer}
      onFocus={pauseTimer}
      onBlur={handleBlur}
      className={`pointer-events-auto flex items-start gap-3 w-full max-w-sm rounded-2xl border p-4 shadow-2xl backdrop-blur-xl transition-all duration-200 ${
        config.borderColor
      } ${config.bgColor} bg-slate-900/95 text-white ${
        isDismissing ? 'opacity-0 translate-y-2 scale-95' : 'opacity-100 translate-y-0 scale-100'
      } ${className}`}
    >
      {/* Type Icon */}
      <div className="shrink-0 mt-0.5">
        <Icon className={`w-5 h-5 ${config.iconColor}`} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pr-1">
        <span className="sr-only">{type}: </span>
        <h4 className="text-sm font-semibold text-white tracking-tight leading-snug">
          {title}
        </h4>
        {message && (
          <p className="text-xs text-blue-200/80 mt-1 leading-relaxed break-words">
            {message}
          </p>
        )}

        {/* Action Button */}
        {action && (
          <div className="mt-2.5">
            <button
              type="button"
              onClick={() => {
                action.onClick();
                handleDismiss();
              }}
              className="text-xs font-semibold px-2.5 py-1 rounded-md bg-white/10 hover:bg-white/20 text-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              {action.label}
            </button>
          </div>
        )}
      </div>

      {/* Dismiss Button */}
      <button
        type="button"
        onClick={handleDismiss}
        aria-label={`Dismiss notification: ${title}`}
        className="shrink-0 -mr-1 -mt-1 p-1 rounded-lg text-blue-300/60 hover:text-white hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

/**
 * ToastContainer manages and renders stacked toast notifications in a screen corner.
 * Can consume from global useUIStore or from local props.
 */
export function ToastContainer({
  toasts: propsToasts,
  onDismiss: propsOnDismiss,
  position = 'bottom-right',
  maxToasts = 5,
  duration = 4000,
  pauseOnHover = true,
  className = '',
}: ToastContainerProps) {
  // Connect to Zustand UI store when props are not provided
  const storeToasts = useUIStore((state) => state.toasts);
  const storeRemoveToast = useUIStore((state) => state.removeToast);

  const activeToasts: ToastItemData[] = (propsToasts ?? storeToasts).map(
    (t: UIStoreToast | ToastItemData) => ({
      id: t.id,
      type: t.type,
      title: t.title,
      message: t.message,
      duration: t.duration ?? duration,
      action: t.action,
    }),
  );

  const handleDismiss = propsOnDismiss ?? storeRemoveToast;

  if (activeToasts.length === 0) {
    return null;
  }

  // Display the newest toasts up to maxToasts. Older toasts stay queued and
  // are shown again (with a fresh timer) once a visible toast is dismissed.
  const displayedToasts = activeToasts.slice(-maxToasts);
  const queuedCount = activeToasts.length - displayedToasts.length;
  const positionClass = POSITION_STYLES[position] || POSITION_STYLES['bottom-right'];

  return (
    <div
      role="region"
      aria-label="Notifications"
      aria-live="polite"
      className={`fixed z-50 pointer-events-none flex flex-col gap-2.5 p-4 sm:p-0 max-w-sm w-full ${positionClass} ${className}`}
    >
      {displayedToasts.map((toast) => (
        <ToastItem
          key={toast.id}
          id={toast.id}
          type={toast.type}
          title={toast.title}
          message={toast.message}
          duration={toast.duration ?? duration}
          onDismiss={handleDismiss}
          action={toast.action}
          pauseOnHover={pauseOnHover}
        />
      ))}
      {queuedCount > 0 && (
        <span className="sr-only">{`${queuedCount} more queued`}</span>
      )}
    </div>
  );
}

/**
 * Standalone Toast component that can render either a single toast or the global stack.
 */
export function Toast(props: Partial<ToastProps> & { toasts?: ToastItemData[] }) {
  if (props.toasts || (!props.title && !props.id)) {
    return <ToastContainer {...props} />;
  }

  return (
    <ToastItem
      title={props.title || ''}
      message={props.message}
      type={props.type}
      duration={props.duration}
      onDismiss={props.onDismiss}
      action={props.action}
      className={props.className}
    />
  );
}

function resolveOptions(options?: number | ToastOptions): ToastOptions {
  if (typeof options === 'number') {
    return { duration: options };
  }
  return options ?? {};
}

function pushToast(
  type: ToastType,
  title: string,
  message?: string,
  options?: number | ToastOptions,
) {
  const { duration = DEFAULT_TOAST_DURATION, action } = resolveOptions(options);
  useUIStore.getState().addToast({ type, title, message, duration, action });
}

/**
 * Imperative toast triggers that integrate with useUIStore.
 * Toasts are queued in the store; pass a number (duration in ms) or a
 * `ToastOptions` object as the third argument to configure auto-dismiss
 * and an optional action.
 */
export const toast = {
  success: (
    title: string,
    message?: string,
    options?: number | ToastOptions,
  ) => pushToast('success', title, message, options),
  error: (
    title: string,
    message?: string,
    options?: number | ToastOptions,
  ) => pushToast('error', title, message, options),
  warning: (
    title: string,
    message?: string,
    options?: number | ToastOptions,
  ) => pushToast('warning', title, message, options),
  info: (
    title: string,
    message?: string,
    options?: number | ToastOptions,
  ) => pushToast('info', title, message, options),
  dismiss: (id: string) => {
    useUIStore.getState().removeToast(id);
  },
};

export default Toast;
