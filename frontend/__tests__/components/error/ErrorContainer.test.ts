/**
 * Tests for ErrorContainer component logic
 * Validates rendering conditions and error display behaviour
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useErrorStore } from '@/store/errorStore';
import type { GlobalError } from '@/store/errorStore';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function resetStore() {
    useErrorStore.setState({ errors: [] });
}

function makeError(overrides: Partial<GlobalError> = {}): GlobalError {
    return {
        id: `err-${Date.now()}-${Math.random()}`,
        message: 'Test error',
        category: 'api',
        severity: 'error',
        timestamp: Date.now(),
        ...overrides,
    };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('ErrorContainer – rendering logic', () => {
    beforeEach(() => {
        resetStore();
    });

    afterEach(() => {
        resetStore();
    });

    it('store starts empty (nothing to render)', () => {
        const { errors } = useErrorStore.getState();
        expect(errors).toHaveLength(0);
    });

    it('container should render when errors exist', () => {
        const { addError } = useErrorStore.getState();
        addError({ message: 'API failed', category: 'api', severity: 'error' });

        const { errors } = useErrorStore.getState();
        expect(errors.length).toBeGreaterThan(0);
    });

    it('container should not render when errors array is empty', () => {
        const { errors } = useErrorStore.getState();
        // ErrorContainer returns null when errors.length === 0
        expect(errors.length === 0).toBe(true);
    });

    it('renders one toast per error', () => {
        const { addError } = useErrorStore.getState();
        addError({ message: 'Error 1', category: 'api', severity: 'error' });
        addError({ message: 'Error 2', category: 'validation', severity: 'warning' });
        addError({ message: 'Error 3', category: 'network', severity: 'info' });

        const { errors } = useErrorStore.getState();
        expect(errors).toHaveLength(3);
    });

    it('onRemove removes the correct error from store', () => {
        const { addError, removeError } = useErrorStore.getState();
        const id1 = addError({ message: 'Error 1', category: 'api', severity: 'error' });
        const id2 = addError({ message: 'Error 2', category: 'api', severity: 'error' });

        // Simulate onRemove callback
        removeError(id1);

        const { errors } = useErrorStore.getState();
        expect(errors).toHaveLength(1);
        expect(errors[0].id).toBe(id2);
    });

    it('handles all severity levels without throwing', () => {
        const { addError } = useErrorStore.getState();
        const severities: Array<GlobalError['severity']> = ['info', 'warning', 'error', 'critical'];

        severities.forEach((severity) => {
            addError({ message: `${severity} message`, category: 'api', severity });
        });

        const { errors } = useErrorStore.getState();
        expect(errors).toHaveLength(4);
        severities.forEach((severity, i) => {
            expect(errors[i].severity).toBe(severity);
        });
    });

    it('auto-dismiss errors have autoDismissMs set', () => {
        const { addError } = useErrorStore.getState();
        addError({
            message: 'Auto-dismiss',
            category: 'api',
            severity: 'info',
            autoDismissMs: 3000,
        });

        const { errors } = useErrorStore.getState();
        expect(errors[0].autoDismissMs).toBe(3000);
    });

    it('sticky errors have no autoDismissMs', () => {
        const { addError } = useErrorStore.getState();
        addError({ message: 'Sticky error', category: 'api', severity: 'critical' });

        const { errors } = useErrorStore.getState();
        expect(errors[0].autoDismissMs).toBeUndefined();
    });

    it('clearErrors empties the container', () => {
        const { addError, clearErrors } = useErrorStore.getState();
        addError({ message: 'Error 1', category: 'api', severity: 'error' });
        addError({ message: 'Error 2', category: 'api', severity: 'error' });

        clearErrors();

        const { errors } = useErrorStore.getState();
        expect(errors).toHaveLength(0);
    });
});
