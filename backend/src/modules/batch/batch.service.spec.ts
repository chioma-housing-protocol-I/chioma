import { Test, TestingModule } from '@nestjs/testing';
import { BatchService } from './batch.service';
import { FavoritesService } from '../favorites/favorites.service';
import { NotificationsService } from '../notifications/notifications.service';
import { BatchOperationType } from './dto/batch-request.dto';

describe('BatchService', () => {
  let service: BatchService;
  let favoritesService: { removeFavorite: jest.Mock };
  let notificationsService: {
    markAsRead: jest.Mock;
    deleteNotification: jest.Mock;
  };

  beforeEach(async () => {
    favoritesService = { removeFavorite: jest.fn() };
    notificationsService = {
      markAsRead: jest.fn(),
      deleteNotification: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BatchService,
        { provide: FavoritesService, useValue: favoritesService },
        { provide: NotificationsService, useValue: notificationsService },
      ],
    }).compile();

    service = module.get(BatchService);
  });

  it('runs each operation against the matching guarded service method, under the caller id', async () => {
    favoritesService.removeFavorite.mockResolvedValue(undefined);
    notificationsService.markAsRead.mockResolvedValue({});
    notificationsService.deleteNotification.mockResolvedValue(undefined);

    const result = await service.execute('user-1', [
      { type: BatchOperationType.REMOVE_FAVORITE, id: 'prop-1' },
      { type: BatchOperationType.MARK_NOTIFICATION_READ, id: 'notif-1' },
      { type: BatchOperationType.DELETE_NOTIFICATION, id: 'notif-2' },
    ]);

    expect(favoritesService.removeFavorite).toHaveBeenCalledWith(
      'user-1',
      'prop-1',
    );
    expect(notificationsService.markAsRead).toHaveBeenCalledWith(
      'notif-1',
      'user-1',
    );
    expect(notificationsService.deleteNotification).toHaveBeenCalledWith(
      'notif-2',
      'user-1',
    );

    expect(result.total).toBe(3);
    expect(result.succeeded).toBe(3);
    expect(result.failed).toBe(0);
    expect(result.results.every((r) => r.success)).toBe(true);
  });

  it('continues past a failing item instead of aborting the batch', async () => {
    favoritesService.removeFavorite
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(
        new Error('Favorite not found for property prop-2'),
      );

    const result = await service.execute('user-1', [
      { type: BatchOperationType.REMOVE_FAVORITE, id: 'prop-1' },
      { type: BatchOperationType.REMOVE_FAVORITE, id: 'prop-2' },
    ]);

    expect(favoritesService.removeFavorite).toHaveBeenCalledTimes(2);
    expect(result.total).toBe(2);
    expect(result.succeeded).toBe(1);
    expect(result.failed).toBe(1);
    expect(result.results[0]).toMatchObject({ id: 'prop-1', success: true });
    expect(result.results[1]).toMatchObject({
      id: 'prop-2',
      success: false,
      error: 'Favorite not found for property prop-2',
    });
  });

  it('preserves operation order in the results array', async () => {
    favoritesService.removeFavorite.mockResolvedValue(undefined);
    notificationsService.markAsRead.mockResolvedValue({});

    const result = await service.execute('user-1', [
      { type: BatchOperationType.MARK_NOTIFICATION_READ, id: 'notif-1' },
      { type: BatchOperationType.REMOVE_FAVORITE, id: 'prop-1' },
    ]);

    expect(result.results.map((r) => r.id)).toEqual(['notif-1', 'prop-1']);
  });

  it("runs each user's batch against their own id, never another user's", async () => {
    favoritesService.removeFavorite.mockResolvedValue(undefined);

    await service.execute('user-attacker', [
      { type: BatchOperationType.REMOVE_FAVORITE, id: 'prop-1' },
    ]);

    expect(favoritesService.removeFavorite).toHaveBeenCalledWith(
      'user-attacker',
      'prop-1',
    );
  });

  it('wraps a non-Error throw with a generic message instead of crashing', async () => {
    favoritesService.removeFavorite.mockRejectedValueOnce('not an Error');

    const result = await service.execute('user-1', [
      { type: BatchOperationType.REMOVE_FAVORITE, id: 'prop-1' },
    ]);

    expect(result.results[0]).toMatchObject({
      success: false,
      error: 'Unknown error',
    });
  });
});
