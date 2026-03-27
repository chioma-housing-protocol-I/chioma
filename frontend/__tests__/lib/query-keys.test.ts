import { describe, it, expect } from 'vitest';
import { queryKeys } from '@/lib/query/keys';

describe('queryKeys', () => {
  describe('properties', () => {
    it('all is a stable tuple', () => {
      expect(queryKeys.properties.all).toEqual(['properties']);
    });

    it('lists extends all', () => {
      expect(queryKeys.properties.lists()).toEqual(['properties', 'list']);
    });

    it('list includes filters', () => {
      const key = queryKeys.properties.list({ city: 'Lagos' });
      expect(key).toEqual(['properties', 'list', { city: 'Lagos' }]);
    });

    it('detail includes the id', () => {
      expect(queryKeys.properties.detail('p-1')).toEqual([
        'properties',
        'detail',
        'p-1',
      ]);
    });
  });

  describe('payments', () => {
    it('byAgreement scopes to an agreement id', () => {
      expect(queryKeys.payments.byAgreement('a-1')).toEqual([
        'payments',
        'agreement',
        'a-1',
      ]);
    });
  });

  describe('notifications', () => {
    it('list without filters uses empty object', () => {
      expect(queryKeys.notifications.list()).toEqual([
        'notifications',
        'list',
        {},
      ]);
    });

    it('list with filters includes them', () => {
      expect(queryKeys.notifications.list({ isRead: false })).toEqual([
        'notifications',
        'list',
        { isRead: false },
      ]);
    });

    it('unreadCount is a stable key', () => {
      expect(queryKeys.notifications.unreadCount()).toEqual([
        'notifications',
        'unread-count',
      ]);
    });
  });

  describe('user', () => {
    it('profile key is consistent', () => {
      expect(queryKeys.user.profile()).toEqual(['user', 'profile']);
    });

    it('preferences key is consistent', () => {
      expect(queryKeys.user.preferences()).toEqual(['user', 'preferences']);
    });
  });

  describe('anchorTransactions', () => {
    it('list includes filters', () => {
      expect(
        queryKeys.anchorTransactions.list({ status: 'processing' }),
      ).toEqual(['anchor-transactions', 'list', { status: 'processing' }]);
    });

    it('detail scopes to an id', () => {
      expect(queryKeys.anchorTransactions.detail('anchor-1')).toEqual([
        'anchor-transactions',
        'detail',
        'anchor-1',
      ]);
    });

    it('stats key is stable', () => {
      expect(queryKeys.anchorTransactions.stats()).toEqual([
        'anchor-transactions',
        'stats',
      ]);
    });
  });

  describe('security', () => {
    it('events key includes filters', () => {
      expect(queryKeys.security.events({ hours: 24 })).toEqual([
        'security',
        'events',
        { hours: 24 },
      ]);
    });

    it('incident metrics key is stable', () => {
      expect(queryKeys.security.incidentMetrics()).toEqual([
        'security',
        'incident-metrics',
      ]);
    });
  });
});
