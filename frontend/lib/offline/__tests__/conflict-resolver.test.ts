/**
 * Tests for conflict resolution strategies.
 */

import { describe, it, expect } from 'vitest';
import {
  registerConflictHandler,
  resolveConflictWithStrategy,
  hasUnresolvedConflicts,
  type ConflictHandler,
} from '../conflict-resolver';

describe('Conflict Resolution', () => {
  describe('registerConflictHandler', () => {
    it('should register a custom conflict handler', () => {
      const handler: ConflictHandler = {
        canHandle: () => true,
        resolve: async () => ({}),
      };

      expect(() => registerConflictHandler(handler)).not.toThrow();
    });
  });

  describe('resolveConflictWithStrategy', () => {
    it('should be defined', () => {
      expect(resolveConflictWithStrategy).toBeDefined();
      expect(typeof resolveConflictWithStrategy).toBe('function');
    });
  });

  describe('hasUnresolvedConflicts', () => {
    it('should check for unresolved conflicts', async () => {
      expect(hasUnresolvedConflicts).toBeDefined();
      expect(typeof hasUnresolvedConflicts).toBe('function');
    });
  });
});
