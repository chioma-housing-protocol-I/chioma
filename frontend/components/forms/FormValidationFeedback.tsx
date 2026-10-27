'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Info,
  Loader2,
} from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

export type ValidationStatus = 'success' | 'error' | 'warning' | 'info' | 'validating';

export interface FieldError {
  field: string;
  message: string;
  type?: string;
}

export interface FormValidationFeedbackProps {
  /**
   * Single error message to display
   */
  error?: string;

  /**
   * Array of field-specific errors
   */
  errors?: FieldError[];

  /**
   * Success message to display
   */
  success?: string;

  /**
   * Warning message to display
   */
  warning?: string;

  /**
   * Info message to display
   */
  info?: string;

  /**
   * Whether validation is in progress
   */
  isValidating?: boolean;

  /**
   * Validation message during async validation
   */
  validatingMessage?: string;

  /**
   * Additional CSS classes
   */
  className?: string;

  /**
   * Whether to show the feedback inline (no border/background)
   */
  inline?: boolean;

  /**
   * Whether to show icons
   */
  showIcon?: boolean;

  /**
   * Whether to auto-dismiss after a delay (in ms)
   */
  autoDismiss?: number;

  /**
   * Callback when dismissed
   */
  onDismiss?: () => void;

  /**
   * Whether to show a dismiss button
   */
  dismissible?: boolean;
}

// ============================================================================
// Component
// ============================================================================

export function FormValidationFeedback({
  error,
  errors = [],
  success,
  warning,
  info,
  isValidating = false,
  validatingMessage = 'Validating...',
  className,
  inline = false,
  showIcon = true,
  autoDismiss,
  onDismiss,
  dismissible = false,
}: FormValidationFeedbackProps) {
  const [isVisible, setIsVisible] = React.useState(true);

  // Determine status and message
  const status: ValidationStatus = React.useMemo(() => {
    if (isValidating) return 'validating';
    if (error || errors.length > 0) return 'error';
    if (success) return 'success';
    if (warning) return 'warning';
    if (info) return 'info';
    return 'info';
  }, [error, errors.length, success, warning, info, isValidating]);

  const message = React.useMemo(() => {
    if (isValidating) return validatingMessage;
    if (error) return error;
    if (success) return success;
    if (warning) return warning;
    if (info) return info;
    return '';
  }, [error, success, warning, info, isValidating, validatingMessage]);

  // Auto-dismiss effect
  React.useEffect(() => {
    if (autoDismiss && (success || info)) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        onDismiss?.();
      }, autoDismiss);

      return () => clearTimeout(timer);
    }
  }, [autoDismiss, success, info, onDismiss]);

  // Reset visibility when content changes
  React.useEffect(() => {
    setIsVisible(true);
  }, [error, errors, success, warning, info]);

  // Don't render if no message and no errors
  if (!message && errors.length === 0) {
    return null;
  }

  // Don't render if dismissed
  if (!isVisible) {
    return null;
  }

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss?.();
  };

  const Icon = getIconForStatus(status);

  // Inline variant
  if (inline) {
    return (
      <div className={cn('space-y-1', className)}>
        {message && (
          <div className={cn('flex items-start gap-2', getTextColorClass(status))}>
            {showIcon && Icon && (
              <Icon className={cn('mt-0.5 h-4 w-4 flex-shrink-0', status === 'validating' && 'animate-spin')} />
            )}
            <p className="text-sm">{message}</p>
          </div>
        )}
        {errors.length > 0 && (
          <ul className="ml-6 space-y-1">
            {errors.map((fieldError, index) => (
              <li key={`${fieldError.field}-${index}`} className="text-sm text-destructive">
                <span className="font-medium">{fieldError.field}:</span> {fieldError.message}
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  // Alert variant
  return (
    <Alert
      variant={status === 'error' ? 'destructive' : 'default'}
      className={cn(
        'relative transition-all',
        getBackgroundClass(status),
        getBorderClass(status),
        className,
      )}
    >
      <div className="flex items-start gap-3">
        {showIcon && Icon && (
          <Icon
            className={cn(
              'h-5 w-5 flex-shrink-0',
              getIconColorClass(status),
              status === 'validating' && 'animate-spin',
            )}
          />
        )}
        <div className="flex-1 space-y-2">
          {message && (
            <AlertDescription className={cn('font-medium', getTextColorClass(status))}>
              {message}
            </AlertDescription>
          )}
          {errors.length > 0 && (
            <ul className="space-y-1.5">
              {errors.map((fieldError, index) => (
                <li
                  key={`${fieldError.field}-${index}`}
                  className="text-sm text-destructive"
                >
                  <span className="font-semibold">{fieldError.field}:</span>{' '}
                  {fieldError.message}
                </li>
              ))}
            </ul>
          )}
        </div>
        {dismissible && onDismiss && (
          <button
            onClick={handleDismiss}
            className={cn(
              'flex-shrink-0 rounded-md p-1 transition-colors hover:bg-black/10',
              getTextColorClass(status),
            )}
            aria-label="Dismiss"
          >
            <XCircle className="h-4 w-4" />
          </button>
        )}
      </div>
    </Alert>
  );
}

// ============================================================================
// Field-Level Validation Feedback
// ============================================================================

export interface FieldValidationFeedbackProps {
  /**
   * Error message for this field
   */
  error?: string;

  /**
   * Success message for this field
   */
  success?: string;

  /**
   * Warning message for this field
   */
  warning?: string;

  /**
   * Info/hint message for this field
   */
  info?: string;

  /**
   * Whether this field is being validated
   */
  isValidating?: boolean;

  /**
   * Additional CSS classes
   */
  className?: string;

  /**
   * Whether to show icons
   */
  showIcon?: boolean;
}

export function FieldValidationFeedback({
  error,
  success,
  warning,
  info,
  isValidating = false,
  className,
  showIcon = true,
}: FieldValidationFeedbackProps) {
  const status: ValidationStatus = React.useMemo(() => {
    if (isValidating) return 'validating';
    if (error) return 'error';
    if (success) return 'success';
    if (warning) return 'warning';
    if (info) return 'info';
    return 'info';
  }, [error, success, warning, info, isValidating]);

  const message = error || success || warning || info;

  if (!message && !isValidating) {
    return null;
  }

  const Icon = getIconForStatus(status);

  return (
    <div
      className={cn('mt-1.5 flex items-start gap-1.5', className)}
      role={error ? 'alert' : 'status'}
      aria-live={error ? 'assertive' : 'polite'}
    >
      {showIcon && Icon && (
        <Icon
          className={cn(
            'mt-0.5 h-3.5 w-3.5 flex-shrink-0',
            getIconColorClass(status),
            status === 'validating' && 'animate-spin',
          )}
        />
      )}
      <p className={cn('text-xs leading-tight', getTextColorClass(status))}>
        {message || 'Validating...'}
      </p>
    </div>
  );
}

// ============================================================================
// Input Wrapper with Validation Feedback
// ============================================================================

export interface ValidatedInputWrapperProps {
  /**
   * Label for the input
   */
  label: string;

  /**
   * Input ID
   */
  id: string;

  /**
   * Whether the field is required
   */
  required?: boolean;

  /**
   * Error message
   */
  error?: string;

  /**
   * Success message
   */
  success?: string;

  /**
   * Warning message
   */
  warning?: string;

  /**
   * Info/hint message
   */
  hint?: string;

  /**
   * Whether validation is in progress
   */
  isValidating?: boolean;

  /**
   * Additional CSS classes for the wrapper
   */
  className?: string;

  /**
   * Children (the input element)
   */
  children: React.ReactNode;
}

export function ValidatedInputWrapper({
  label,
  id,
  required = false,
  error,
  success,
  warning,
  hint,
  isValidating = false,
  className,
  children,
}: ValidatedInputWrapperProps) {
  const hasError = Boolean(error);
  const hasSuccess = Boolean(success);
  const hasWarning = Boolean(warning);

  return (
    <div className={cn('space-y-2', className)}>
      <label
        htmlFor={id}
        className={cn(
          'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
          hasError && 'text-destructive',
        )}
      >
        {label}
        {required && <span className="ml-1 text-destructive">*</span>}
      </label>

      <div className="relative">
        {children}
        {isValidating && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}
        {hasSuccess && !isValidating && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </div>
        )}
      </div>

      <FieldValidationFeedback
        error={error}
        success={success}
        warning={warning}
        info={hint}
        isValidating={isValidating}
      />
    </div>
  );
}

// ============================================================================
// Helper Functions
// ============================================================================

function getIconForStatus(status: ValidationStatus) {
  switch (status) {
    case 'success':
      return CheckCircle2;
    case 'error':
      return XCircle;
    case 'warning':
      return AlertCircle;
    case 'info':
      return Info;
    case 'validating':
      return Loader2;
    default:
      return Info;
  }
}

function getTextColorClass(status: ValidationStatus): string {
  switch (status) {
    case 'success':
      return 'text-green-700 dark:text-green-400';
    case 'error':
      return 'text-destructive';
    case 'warning':
      return 'text-yellow-700 dark:text-yellow-400';
    case 'info':
      return 'text-blue-700 dark:text-blue-400';
    case 'validating':
      return 'text-muted-foreground';
    default:
      return 'text-foreground';
  }
}

function getIconColorClass(status: ValidationStatus): string {
  switch (status) {
    case 'success':
      return 'text-green-600 dark:text-green-500';
    case 'error':
      return 'text-destructive';
    case 'warning':
      return 'text-yellow-600 dark:text-yellow-500';
    case 'info':
      return 'text-blue-600 dark:text-blue-500';
    case 'validating':
      return 'text-muted-foreground';
    default:
      return 'text-foreground';
  }
}

function getBackgroundClass(status: ValidationStatus): string {
  switch (status) {
    case 'success':
      return 'bg-green-50 dark:bg-green-950/30';
    case 'error':
      return 'bg-destructive/10';
    case 'warning':
      return 'bg-yellow-50 dark:bg-yellow-950/30';
    case 'info':
      return 'bg-blue-50 dark:bg-blue-950/30';
    case 'validating':
      return 'bg-muted/50';
    default:
      return 'bg-background';
  }
}

function getBorderClass(status: ValidationStatus): string {
  switch (status) {
    case 'success':
      return 'border-green-200 dark:border-green-800';
    case 'error':
      return 'border-destructive/50';
    case 'warning':
      return 'border-yellow-200 dark:border-yellow-800';
    case 'info':
      return 'border-blue-200 dark:border-blue-800';
    case 'validating':
      return 'border-muted';
    default:
      return 'border-border';
  }
}

// ============================================================================
// Exports
// ============================================================================

export default FormValidationFeedback;
