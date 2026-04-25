/**
 * Test Isolation Setup
 * Ensures proper cleanup and isolation between tests
 */

import { jest } from '@jest/globals';

// ─── Global Test Hooks ───────────────────────────────────────────────────────

beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
});

afterEach(() => {
    // Clear all mocks after each test
    jest.clearAllMocks();
    // Clear all timers
    jest.clearAllTimers();
    // Restore all mocked modules
    jest.restoreAllMocks();
});

// ─── Environment Variable Isolation ──────────────────────────────────────────

const originalEnv = { ...process.env };

afterEach(() => {
    // Restore original environment variables
    process.env = { ...originalEnv };
});

// ─── Mock Reset Utilities ────────────────────────────────────────────────────

export function resetAllMocks() {
    jest.clearAllMocks();
    jest.restoreAllMocks();
}

export function resetMock(mock: jest.Mock) {
    mock.mockClear();
    mock.mockReset();
}

export function resetMocks(...mocks: jest.Mock[]) {
    mocks.forEach((mock) => {
        mock.mockClear();
        mock.mockReset();
    });
}

// ─── Store Reset Utilities ───────────────────────────────────────────────────

export function createStoreResetHelper<T extends Record<string, any>>(
    store: any,
    initialState: T,
) {
    return () => {
        store.setState(initialState);
    };
}

// ─── Database Transaction Isolation ──────────────────────────────────────────

export function createMockDataSourceWithTransaction(entityManager: any) {
    return {
        transaction: jest.fn(
            (cb: (em: typeof entityManager) => Promise<unknown>) => cb(entityManager),
        ),
        createQueryBuilder: jest.fn(),
        getRepository: jest.fn(),
    };
}

// ─── Idempotency Key Generation ──────────────────────────────────────────────

export function generateTestIdempotencyKey(prefix = 'test'): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// ─── Test Data Builders ──────────────────────────────────────────────────────

export function createMockPayment(overrides = {}) {
    return {
        id: `pay-${Date.now()}`,
        amount: 1000,
        currency: 'USDC',
        status: 'completed',
        createdAt: new Date(),
        ...overrides,
    };
}

export function createMockPaymentMethod(overrides = {}) {
    return {
        id: `pm-${Date.now()}`,
        type: 'card',
        last4: '1234',
        expiryMonth: 12,
        expiryYear: 2025,
        isDefault: false,
        createdAt: new Date(),
        ...overrides,
    };
}

export function createMockUser(overrides = {}) {
    return {
        id: `user-${Date.now()}`,
        email: `test-${Date.now()}@example.com`,
        firstName: 'Test',
        lastName: 'User',
        role: 'user',
        createdAt: new Date(),
        ...overrides,
    };
}

export function createMockAgreement(overrides = {}) {
    return {
        id: `agr-${Date.now()}`,
        landlordId: `user-${Date.now()}`,
        tenantId: `user-${Date.now()}`,
        propertyId: `prop-${Date.now()}`,
        rentAmount: 1500,
        currency: 'USDC',
        status: 'active',
        createdAt: new Date(),
        ...overrides,
    };
}

// ─── Async Test Utilities ────────────────────────────────────────────────────

export async function waitFor(
    condition: () => boolean,
    timeout = 1000,
    interval = 50,
): Promise<void> {
    const startTime = Date.now();
    while (!condition()) {
        if (Date.now() - startTime > timeout) {
            throw new Error('Timeout waiting for condition');
        }
        await new Promise((resolve) => setTimeout(resolve, interval));
    }
}

export function createDeferredPromise<T>() {
    let resolve: (value: T) => void;
    let reject: (reason?: any) => void;
    const promise = new Promise<T>((res, rej) => {
        resolve = res;
        reject = rej;
    });
    return { promise, resolve: resolve!, reject: reject! };
}

// ─── Mock Repository Builders ────────────────────────────────────────────────

export function createMockRepository<T = any>() {
    return {
        findOne: jest.fn(),
        find: jest.fn(),
        findBy: jest.fn(),
        findByIds: jest.fn(),
        create: jest.fn(),
        save: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        remove: jest.fn(),
        createQueryBuilder: jest.fn(),
        count: jest.fn(),
        increment: jest.fn(),
        decrement: jest.fn(),
    };
}

// ─── Query Builder Mock ──────────────────────────────────────────────────────

export function createMockQueryBuilder<T = any>() {
    return {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        getOne: jest.fn(),
        getMany: jest.fn(),
        getManyAndCount: jest.fn(),
        getCount: jest.fn(),
        getRawOne: jest.fn(),
        getRawMany: jest.fn(),
    };
}
