import { describe, it, expect, beforeEach } from 'vitest';
import {
  readStorage,
  writeStorage,
  removeStorage,
  clearNamespace,
} from '@/lib/persistence/storage';

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('persistence/storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('writeStorage + readStorage round-trips data correctly', () => {
    writeStorage('test', 'prefs', { darkMode: true });
    const result = readStorage<{ darkMode: boolean }>('test', 'prefs');
    expect(result).toEqual({ darkMode: true });
  });

  it('readStorage returns null for missing keys', () => {
    expect(readStorage('test', 'missing')).toBeNull();
  });

  it('readStorage discards data with mismatched version', () => {
    writeStorage('test', 'versioned', { v: 1 }, 1);
    const result = readStorage('test', 'versioned', { version: 2 });
    expect(result).toBeNull();

    // Key should have been removed
    expect(localStorage.getItem('chioma_test_versioned')).toBeNull();
  });

  it('readStorage returns data when version matches', () => {
    writeStorage('test', 'versioned', { v: 1 }, 3);
    const result = readStorage('test', 'versioned', { version: 3 });
    expect(result).toEqual({ v: 1 });
  });

  it('readStorage handles corrupted JSON gracefully', () => {
    localStorage.setItem('chioma_test_corrupt', 'not-json');
    const result = readStorage('test', 'corrupt');
    expect(result).toBeNull();
    expect(localStorage.getItem('chioma_test_corrupt')).toBeNull();
  });

  it('removeStorage deletes a single key', () => {
    writeStorage('test', 'item', 42);
    removeStorage('test', 'item');
    expect(readStorage('test', 'item')).toBeNull();
  });

  it('clearNamespace removes all keys in a namespace', () => {
    writeStorage('app', 'a', 1);
    writeStorage('app', 'b', 2);
    writeStorage('other', 'c', 3);

    clearNamespace('app');

    expect(readStorage('app', 'a')).toBeNull();
    expect(readStorage('app', 'b')).toBeNull();
    expect(readStorage('other', 'c')).toEqual(3);
  });
});
