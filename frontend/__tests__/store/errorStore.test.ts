import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useErrorStore } from '@/store/errorStore';
import type { GlobalError } from '@/store/errorStore';

describe('errorStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useErrorStore.setState({
      errors: [],
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Clean up after each test
    useErrorStore.setState({
      errors: [],
    });
  });

  describe('initial state', () => {
    it('starts with empty errors array', () => {
      const state = useErrorStore.getState();
      expect(state.errors).toEqual([]);
    });
  });

  describe('addError', () => {
    it('adds error to store and returns error id', () => {
      const { addError } = useErrorStore.getState();
      const errorId = addError({
        message: 'Test error',
        category: 'api',
        severity: 'error',
      });

      expect(errorId).toBeDefined();
      expect(errorId).toMatch(/^err-\d+-\d+$/);

      const state = useErrorStore.getState();
      expect(state.errors).toHaveLength(1);
      expect(state.errors[0].id).toBe(errorId);
    });

    it('adds error with all properties', () => {
      const { addError } = useErrorStore.getState();
      const errorData = {
        message: 'Test error',
        category: 'validation' as const,
        severity: 'warning' as const,
        autoDismissMs: 3000,
        cause: new Error('Original error'),
      };

      addError(errorData);

      const state = useErrorStore.getState();
      const error = state.errors[0];
      expect(error.message).toBe(errorData.message);
      expect(error.category).toBe(errorData.category);
      expect(error.severity).toBe(errorData.severity);
      expect(error.autoDismissMs).toBe(errorData.autoDismissMs);
      expect(error.cause).toBe(errorData.cause);
      expect(error.timestamp).toBeDefined();
    });

    it('generates unique error ids', () => {
      const { addError } = useErrorStore.getState();
      const id1 = addError({
        message: 'Error 1',
        category: 'api',
        severity: 'error',
      });
      const id2 = addError({
        message: 'Error 2',
        category: 'api',
        severity: 'error',
      });

      expect(id1).not.toBe(id2);
    });

    it('adds multiple errors in order', () => {
      const { addError } = useErrorStore.getState();
      addError({
        message: 'First error',
        category: 'api',
        severity: 'error',
      });
      addError({
        message: 'Second error',
        category: 'validation',
        severity: 'warning',
      });

      const state = useErrorStore.getState();
      expect(state.errors).toHaveLength(2);
      expect(state.errors[0].message).toBe('First error');
      expect(state.errors[1].message).toBe('Second error');
    });

    it('sets timestamp on error', () => {
      const { addError } = useErrorStore.getState();
      const beforeTime = Date.now();
      addError({
        message: 'Test error',
        category: 'api',
        severity: 'error',
      });
      const afterTime = Date.now();

      const state = useErrorStore.getState();
      const error = state.errors[0];
      expect(error.timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(error.timestamp).toBeLessThanOrEqual(afterTime);
    });

    it('handles all severity levels', () => {
      const { addError } = useErrorStore.getState();
      const severities: Array<'info' | 'warning' | 'error' | 'critical'> = [
        'info',
        'warning',
        'error',
        'critical',
      ];

      severities.forEach((severity) => {
        addError({
          message: `${severity} error`,
          category: 'api',
          severity,
        });
      });

      const state = useErrorStore.getState();
      expect(state.errors).toHaveLength(4);
      state.errors.forEach((error, index) => {
        expect(error.severity).toBe(severities[index]);
      });
    });

    it('handles all error categories', () => {
      const { addError } = useErrorStore.getState();
      const categories: Array<
        | 'validation'
        | 'api'
        | 'network'
        | 'authentication'
        | 'authorization'
        | 'server'
        | 'unknown'
      > = [
        'validation',
        'api',
        'network',
        'authentication',
        'authorization',
        'server',
        'unknown',
      ];

      categories.forEach((category) => {
        addError({
          message: `${category} error`,
          category,
          severity: 'error',
        });
      });

      const state = useErrorStore.getState();
      expect(state.errors).toHaveLength(7);
      state.errors.forEach((error, index) => {
        expect(error.category).toBe(categories[index]);
      });
    });
  });

  describe('removeError', () => {
    it('removes error by id', () => {
      const { addError, removeError } = useErrorStore.getState();
      const id = addError({
        message: 'Test error',
        category: 'api',
        severity: 'error',
      });

      removeError(id);

      const state = useErrorStore.getState();
      expect(state.errors).toHaveLength(0);
    });

    it('removes only specified error', () => {
      const { addError, removeError } = useErrorStore.getState();
      const id1 = addError({
        message: 'Error 1',
        category: 'api',
        severity: 'error',
      });
      const id2 = addError({
        message: 'Error 2',
        category: 'api',
        severity: 'error',
      });

      removeError(id1);

      const state = useErrorStore.getState();
      expect(state.errors).toHaveLength(1);
      expect(state.errors[0].id).toBe(id2);
    });

    it('handles removing non-existent error gracefully', () => {
      const { addError, removeError } = useErrorStore.getState();
      addError({
        message: 'Test error',
        category: 'api',
        severity: 'error',
      });

      removeError('non-existent-id');

      const state = useErrorStore.getState();
      expect(state.errors).toHaveLength(1);
    });

    it('removes multiple errors sequentially', () => {
      const { addError, removeError } = useErrorStore.getState();
      const id1 = addError({
        message: 'Error 1',
        category: 'api',
        severity: 'error',
      });
      const id2 = addError({
        message: 'Error 2',
        category: 'api',
        severity: 'error',
      });
      const id3 = addError({
        message: 'Error 3',
        category: 'api',
        severity: 'error',
      });

      removeError(id1);
      expect(useErrorStore.getState().errors).toHaveLength(2);

      removeError(id3);
      expect(useErrorStore.getState().errors).toHaveLength(1);

      removeError(id2);
      expect(useErrorStore.getState().errors).toHaveLength(0);
    });
  });

  describe('clearErrors', () => {
    it('clears all errors', () => {
      const { addError, clearErrors } = useErrorStore.getState();
      addError({
        message: 'Error 1',
        category: 'api',
        severity: 'error',
      });
      addError({
        message: 'Error 2',
        category: 'api',
        severity: 'error',
      });

      clearErrors();

      const state = useErrorStore.getState();
      expect(state.errors).toHaveLength(0);
    });

    it('handles clearing empty errors array', () => {
      const { clearErrors } = useErrorStore.getState();
      clearErrors();

      const state = useErrorStore.getState();
      expect(state.errors).toHaveLength(0);
    });
  });

  describe('getErrors', () => {
    it('returns all errors', () => {
      const { addError, getErrors } = useErrorStore.getState();
      addError({
        message: 'Error 1',
        category: 'api',
        severity: 'error',
      });
      addError({
        message: 'Error 2',
        category: 'api',
        severity: 'error',
      });

      const errors = getErrors();
      expect(errors).toHaveLength(2);
    });

    it('returns empty array when no errors', () => {
      const { getErrors } = useErrorStore.getState();
      const errors = getErrors();
      expect(errors).toEqual([]);
    });

    it('returns errors in insertion order', () => {
      const { addError, getErrors } = useErrorStore.getState();
      addError({
        message: 'First',
        category: 'api',
        severity: 'error',
      });
      addError({
        message: 'Second',
        category: 'api',
        severity: 'error',
      });
      addError({
        message: 'Third',
        category: 'api',
        severity: 'error',
      });

      const errors = getErrors();
      expect(errors[0].message).toBe('First');
      expect(errors[1].message).toBe('Second');
      expect(errors[2].message).toBe('Third');
    });
  });

  describe('store isolation', () => {
    it('does not share state between test instances', () => {
      const { addError: addError1 } = useErrorStore.getState();
      addError1({
        message: 'Test error',
        category: 'api',
        severity: 'error',
      });

      // Reset store
      useErrorStore.setState({ errors: [] });

      const { getErrors: getErrors2 } = useErrorStore.getState();
      expect(getErrors2()).toHaveLength(0);
    });

    it('properly isolates concurrent operations', () => {
      const { addError, removeError, getErrors } = useErrorStore.getState();

      const id1 = addError({
        message: 'Error 1',
        category: 'api',
        severity: 'error',
      });
      const id2 = addError({
        message: 'Error 2',
        category: 'api',
        severity: 'error',
      });

      removeError(id1);
      const errors = getErrors();

      expect(errors).toHaveLength(1);
      expect(errors[0].id).toBe(id2);
    });
  });

  describe('error properties', () => {
    it('includes all required properties in error object', () => {
      const { addError } = useErrorStore.getState();
      addError({
        message: 'Test error',
        category: 'api',
        severity: 'error',
      });

      const error = useErrorStore.getState().errors[0];
      expect(error).toHaveProperty('id');
      expect(error).toHaveProperty('message');
      expect(error).toHaveProperty('category');
      expect(error).toHaveProperty('severity');
      expect(error).toHaveProperty('timestamp');
    });

    it('includes optional properties when provided', () => {
      const { addError } = useErrorStore.getState();
      const cause = new Error('Original');
      addError({
        message: 'Test error',
        category: 'api',
        severity: 'error',
        autoDismissMs: 5000,
        cause,
      });

      const error = useErrorStore.getState().errors[0];
      expect(error.autoDismissMs).toBe(5000);
      expect(error.cause).toBe(cause);
    });
  });
});
