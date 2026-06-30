'use client';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface TimeoutAlertProps {
  message?: string;
  onRetry?: () => void;
  isRetrying?: boolean;
}

export function TimeoutAlert({ message, onRetry, isRetrying }: TimeoutAlertProps) {
  const defaultMessage = 'The request took too long to complete. Please try again.';

  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Request Timeout</AlertTitle>
      <AlertDescription className="flex items-center justify-between gap-4">
        <span>{message || defaultMessage}</span>
        {onRetry && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            disabled={isRetrying}
            className="shrink-0"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRetrying ? 'animate-spin' : ''}`} />
            Retry
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}
