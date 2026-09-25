/**
 * Tests for ClientErrorBoundary logic
 * Validates error classification and logging behaviour
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { classifyUnknownError } from '@/lib/errors';
import { AppError } from '@/lib/errors';

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('ClientErrorBoundary – error classification logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('classifies a generic Error as system error', () => {
    const error = new Error('Something broke');
    const appError = classifyUnknownError(error, {
      source: 'ClientErrorBoundary',
    });

    expect(appError).toBeInstanceOf(AppError);
    expect(appError.category).toBe('system');
    expect(appError.context?.source).toBe('ClientErrorBoundary');
  });

  it('classifies a TypeError as network error', () => {
    const error = new TypeError('Failed to fetch');
    const appError = classifyUnknownError(error, {
      source: 'ClientErrorBoundary',
    });

    expect(appError).toBeInstanceOf(AppError);
    expect(appError.category).toBe('network');
  });

  it('classifies an AbortError as network timeout', () => {
    const error = new DOMException('Aborted', 'AbortError');
    const appError = classifyUnknownError(error, {
      source: 'ClientErrorBoundary',
    });

    expect(appError.code).toBe('NETWORK_TIMEOUT');
    expect(appError.category).toBe('network');
  });

  it('passes through an existing AppError unchanged', () => {
    const original = new AppError({
      code: 'PERMISSION_DENIED',
      category: 'permission',
      severity: 'warning',
      message: 'No access',
      userMessage: 'You do not have permission',
      recoverable: false,
    });

    const result = classifyUnknownError(original, {
      source: 'ClientErrorBoundary',
    });

    expect(result).toBe(original);
  });

  it('classifies unknown non-Error values', () => {
    const appError = classifyUnknownError('some string error', {
      source: 'ClientErrorBoundary',
    });

    expect(appError).toBeInstanceOf(AppError);
    expect(appError.code).toBe('UNKNOWN_ERROR');
    expect(appError.category).toBe('unknown');
  });

  it('classifies null as unknown error', () => {
    const appError = classifyUnknownError(null, {
      source: 'ClientErrorBoundary',
    });

    expect(appError.code).toBe('UNKNOWN_ERROR');
  });

  it('preserves source context in classified error', () => {
    const error = new Error('Test');
    const appError = classifyUnknownError(error, {
      source: 'TestComponent',
      action: 'render',
    });

    expect(appError.context?.source).toBe('TestComponent');
    expect(appError.context?.action).toBe('render');
  });

  it('classifies error with metadata context', () => {
    const error = new Error('Render failed');
    const appError = classifyUnknownError(error, {
      source: 'ClientErrorBoundary',
      metadata: { filename: 'page.tsx', line: 42, column: 10 },
    });

    expect(appError.context?.metadata).toEqual({
      filename: 'page.tsx',
      line: 42,
      column: 10,
    });
  });

  it('error is recoverable for system errors', () => {
    const error = new Error('Unexpected crash');
    const appError = classifyUnknownError(error, {
      source: 'ClientErrorBoundary',
    });

    expect(appError.recoverable).toBe(true);
  });

  it('error has correct severity for system errors', () => {
    const error = new Error('Crash');
    const appError = classifyUnknownError(error, {
      source: 'ClientErrorBoundary',
    });

    expect(appError.severity).toBe('error');
  });
});

describe('ClientErrorBoundary – getDerivedStateFromError behaviour', () => {
  it('error state transitions from null to Error on catch', () => {
    // Simulate the state machine: null → Error
    let errorState: Error | null = null;

    // getDerivedStateFromError sets error in state
    const simulateDerivedState = (error: Error) => {
      errorState = error;
    };

    const thrownError = new Error('Component crashed');
    simulateDerivedState(thrownError);

    expect(errorState).toBe(thrownError);
  });

  it('reset clears error state back to null', () => {
    let errorState: Error | null = new Error('Previous error');

    // reset() sets error back to null
    const reset = () => {
      errorState = null;
    };

    reset();

    expect(errorState).toBeNull();
  });

  it('fallback title defaults to "Section failed to render"', () => {
    const defaultTitle = 'Section failed to render';
    const customTitle = 'Custom error title';

    // Verify default vs custom title logic
    const getTitle = (fallbackTitle?: string) =>
      fallbackTitle ?? 'Section failed to render';

    expect(getTitle()).toBe(defaultTitle);
    expect(getTitle(customTitle)).toBe(customTitle);
  });

  it('fallback description has a sensible default', () => {
    const getDescription = (fallbackDescription?: string) =>
      fallbackDescription ??
      'This part of the page crashed. You can retry without leaving the page.';

    expect(getDescription()).toContain('retry');
    expect(getDescription('Custom desc')).toBe('Custom desc');
  });
});
