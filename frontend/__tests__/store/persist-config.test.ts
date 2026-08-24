import { describe, it, expect } from 'vitest';
import { createVersionedPersistConfig } from '@/store/persistence';

interface TestState {
  theme: 'light' | 'dark' | 'system';
  sidebarCollapsed: boolean;
}

describe('createVersionedPersistConfig', () => {
  it('returns undefined for versions newer than the current schema', () => {
    const config = createVersionedPersistConfig<TestState>({
      name: 'test-store',
      version: 1,
    });

    const result = config.migrate?.(
      { theme: 'dark', sidebarCollapsed: true },
      2,
    );

    expect(result).toBeUndefined();
  });

  it('returns undefined when no migration path exists', () => {
    const config = createVersionedPersistConfig<TestState>({
      name: 'test-store',
      version: 2,
      migrations: {
        2: (state) => state as Partial<TestState>,
      },
    });

    const result = config.migrate?.(
      { theme: 'dark', sidebarCollapsed: true },
      0,
    );

    expect(result).toBeUndefined();
  });

  it('applies sequential migrations for a version bump', () => {
    const config = createVersionedPersistConfig<TestState>({
      name: 'test-store',
      version: 2,
      migrations: {
        1: (state) => {
          const legacy = state as Record<string, unknown>;
          return {
            theme:
              legacy.darkMode === true
                ? 'dark'
                : legacy.darkMode === false
                  ? 'light'
                  : 'system',
            sidebarCollapsed: false,
          };
        },
        2: (state) => {
          const current = state as Partial<TestState>;
          return {
            theme: current.theme ?? 'system',
            sidebarCollapsed: true,
          };
        },
      },
    });

    const result = config.migrate?.({ darkMode: true }, 0);

    expect(result).toEqual({ theme: 'dark', sidebarCollapsed: true });
  });

  it('sanitizes legacy UI store state during v0 -> v1 migration', () => {
    const config = createVersionedPersistConfig<TestState>({
      name: 'chioma-ui',
      version: 1,
      migrations: {
        1: (state) => {
          const legacy = state as Record<string, unknown>;
          const theme = ['light', 'dark', 'system'].includes(
            legacy.theme as string,
          )
            ? (legacy.theme as TestState['theme'])
            : 'system';

          return {
            theme,
            sidebarCollapsed:
              typeof legacy.sidebarCollapsed === 'boolean'
                ? legacy.sidebarCollapsed
                : false,
          };
        },
      },
    });

    const result = config.migrate?.(
      { theme: 'invalid', sidebarCollapsed: 'yes', sidebarOpen: true },
      0,
    );

    expect(result).toEqual({ theme: 'system', sidebarCollapsed: false });
  });
});
