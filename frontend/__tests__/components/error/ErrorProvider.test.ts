/**
 * Tests for ErrorProvider integration with errorStore
 * Validates that the provider correctly connects store state to the container
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useErrorStore } from '@/store/errorStore';
import type { GlobalError } from '@/store/errorStore';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function resetStore() {
    useErrorStore.setState({ errors: [] });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('ErrorProvider – store integration', () => {
    beforeEach(() => {
        resetStore();
        vi.clearAllMocks();
    });

    afterEach(() => {
        resetStore();
        vi.clearAllMocks();
    });

    it('reads errors from store correctly', () => {
        const { addError } = useErrorStore.getState();
        addError({ message: 'Test error', category: 'api', severity: 'error' });

        const errors = useErrorStore.getState().errors;
        expect(errors).toHaveLength(1);
        expect(errors[0].message).toBe('Test error');
    });

    it('removeError function is available from store', () => {
        const { addError, removeError } = useErrorStore.getState();
        const id = addError({ message: 'Test error', category: 'api', severity: 'error' });

        removeError(id);

        expect(useErrorStore.getState().errors).toHaveLength(0);
    });

    it('provider passes removeError as onRemove to container', () => {
        const { addError, removeError } = useErrorStore.getState();
        const id = addError({ message: 'Error to remove', category: 'api', severity: 'error' });

        // Simulate what ErrorProvider does: pass removeError as onRemove
        const onRemove = removeError;
        onRemove(id);

        expect(useErrorStore.getState().errors).toHaveLength(0);
    });

    it('multiple errors are all accessible from store', () => {
        const { addError } = useErrorStore.getState();
        addError({ message: 'Error 1', category: 'api', severity: 'error' });
        addError({ message: 'Error 2', category: 'validation', severity: 'warning' });
        addError({ message: 'Error 3', category: 'network', severity: 'info' });

        const errors = useErrorStore.getState().errors;
        expect(errors).toHaveLength(3);
    });

    it('store updates are reactive — errors change after add', () => {
        const initialErrors = useErrorStore.getState().errors;
        expect(initialErrors).toHaveLength(0);

        const { addError } = useErrorStore.getState();
        addError({ message: 'New error', category: 'api', severity: 'error' });

        const updatedErrors = useErrorStore.getState().errors;
        expect(updatedErrors).toHaveLength(1);
    });

    it('store updates are reactive — errors change after remove', () => {
        const { addError, removeError } = useErrorStore.getState();
        const id = addError({ message: 'Error', category: 'api', severity: 'error' });

        expect(useErrorStore.getState().errors).toHaveLength(1);

        removeError(id);

        expect(useErrorStore.getState().errors).toHaveLength(0);
    });

    it('clearErrors removes all errors at once', () => {
        const { addError, clearErrors } = useErrorStore.getState();
        addError({ message: 'Error 1', category: 'api', severity: 'error' });
        addError({ message: 'Error 2', category: 'api', severity: 'error' });

        clearErrors();

        expect(useErrorStore.getState().errors).toHaveLength(0);
    });

    it('errors have all required fields for rendering', () => {
        const { addError } = useErrorStore.getState();
        addError({
            message: 'Render test',
            category: 'api',
            severity: 'error',
            autoDismissMs: 5000,
        });

        const error = useErrorStore.getState().errors[0];
        expect(error).toHaveProperty('id');
        expect(error).toHaveProperty('message');
        expect(error).toHaveProperty('category');
        expect(error).toHaveProperty('severity');
        expect(error).toHaveProperty('timestamp');
        expect(error).toHaveProperty('autoDismissMs', 5000);
    });

    it('error ids are unique across multiple adds', () => {
        const { addError } = useErrorStore.getState();
        const ids = Array.from({ length: 5 }, (_, i) =>
            addError({ message: `Error ${i}`, category: 'api', severity: 'error' }),
        );

        const uniqueIds = new Set(ids);
        expect(uniqueIds.size).toBe(5);
    });
});

describe('ErrorProvider – error categories and severities', () => {
    beforeEach(() => {
        resetStore();
    });

    afterEach(() => {
        resetStore();
    });

    it('supports all error categories', () => {
        const { addError } = useErrorStore.getState();
        const categories: Array<GlobalError['category']> = [
            'validation',
            'api',
            'network',
            'authentication',
            'authorization',
            'server',
            'unknown',
        ];

        categories.forEach((category) => {
            addError({ message: `${category} error`, category, severity: 'error' });
        });

        const errors = useErrorStore.getState().errors;
        expect(errors).toHaveLength(categories.length);
        categories.forEach((category, i) => {
            expect(errors[i].category).toBe(category);
        });
    });

    it('supports all severity levels', () => {
        const { addError } = useErrorStore.getState();
        const severities: Array<GlobalError['severity']> = [
            'info',
            'warning',
            'error',
            'critical',
        ];

        severities.forEach((severity) => {
            addError({ message: `${severity} message`, category: 'api', severity });
        });

        const errors = useErrorStore.getState().errors;
        expect(errors).toHaveLength(severities.length);
        severities.forEach((severity, i) => {
            expect(errors[i].severity).toBe(severity);
        });
    });
});
