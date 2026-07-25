/**
 * Frontend Test Isolation Setup
 * Ensures proper cleanup and isolation between tests
 */

import { vi, beforeEach, afterEach } from 'vitest';

// ─── Global Test Hooks ───────────────────────────────────────────────────────

beforeEach(() => {
  // Clear all mocks before each test
  vi.clearAllMocks();
  // Clear localStorage
  localStorage.clear();
  // Clear sessionStorage
  sessionStorage.clear();
});

afterEach(() => {
  // Clear all mocks after each test
  vi.clearAllMocks();
  // Clear all timers
  vi.clearAllTimers();
  // Restore all mocked modules
  vi.restoreAllMocks();
  // Clear storage
  localStorage.clear();
  sessionStorage.clear();
});

// ─── Mock Reset Utilities ────────────────────────────────────────────────────

export function resetAllMocks() {
  vi.clearAllMocks();
  vi.restoreAllMocks();
}

export function resetMock(mock: any) {
  mock.mockClear();
  mock.mockReset();
}

export function resetMocks(...mocks: any[]) {
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

// ─── Storage Utilities ───────────────────────────────────────────────────────

export function setLocalStorage(key: string, value: any) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function getLocalStorage(key: string) {
  const value = localStorage.getItem(key);
  return value ? JSON.parse(value) : null;
}

export function clearLocalStorage() {
  localStorage.clear();
}

export function setSessionStorage(key: string, value: any) {
  sessionStorage.setItem(key, JSON.stringify(value));
}

export function getSessionStorage(key: string) {
  const value = sessionStorage.getItem(key);
  return value ? JSON.parse(value) : null;
}

export function clearSessionStorage() {
  sessionStorage.clear();
}

// ─── Test Data Builders ──────────────────────────────────────────────────────

export function createMockUser(overrides = {}) {
  return {
    id: `user-${Date.now()}`,
    email: `test-${Date.now()}@example.com`,
    firstName: 'Test',
    lastName: 'User',
    role: 'user' as const,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

export function createMockError(overrides = {}) {
  return {
    id: `err-${Date.now()}`,
    message: 'Test error',
    category: 'api' as const,
    severity: 'error' as const,
    timestamp: Date.now(),
    ...overrides,
  };
}

export function createMockNotification(overrides = {}) {
  return {
    id: `notif-${Date.now()}`,
    type: 'payment' as const,
    title: 'Test notification',
    body: 'This is a test notification',
    read: false,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

export function createMockPayment(overrides = {}) {
  return {
    id: `pay-${Date.now()}`,
    amount: 1000,
    currency: 'USDC',
    status: 'completed',
    createdAt: new Date().toISOString(),
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
    createdAt: new Date().toISOString(),
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

// ─── Mock API Client ─────────────────────────────────────────────────────────

export function createMockApiClient() {
  return {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    request: vi.fn(),
  };
}

// ─── Mock Fetch ──────────────────────────────────────────────────────────────

export function createMockFetch(response: any = {}) {
  return vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: vi.fn().mockResolvedValue(response),
    text: vi.fn().mockResolvedValue(JSON.stringify(response)),
    blob: vi.fn().mockResolvedValue(new Blob()),
  });
}

// ─── Mock Router ─────────────────────────────────────────────────────────────

export function createMockRouter() {
  return {
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
    pathname: '/',
    query: {},
    asPath: '/',
  };
}

// ─── Component Render Helpers ────────────────────────────────────────────────

export function createMockRenderContext() {
  return {
    user: createMockUser(),
    isAuthenticated: true,
    isLoading: false,
  };
}

// ─── Event Simulation ────────────────────────────────────────────────────────

export function createMouseEvent(type: string, options = {}) {
  return new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    ...options,
  });
}

export function createKeyboardEvent(type: string, key: string, options = {}) {
  return new KeyboardEvent(type, {
    key,
    bubbles: true,
    cancelable: true,
    ...options,
  });
}

export function createChangeEvent(value: string) {
  return new Event('change', { bubbles: true });
}

// ─── Timer Utilities ─────────────────────────────────────────────────────────

export function advanceTimersByTime(ms: number) {
  vi.advanceTimersByTime(ms);
}

export function runAllTimers() {
  vi.runAllTimers();
}

export function useRealTimers() {
  vi.useRealTimers();
}

export function useFakeTimers() {
  vi.useFakeTimers();
}
