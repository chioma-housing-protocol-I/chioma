import { Test, TestingModule } from '@nestjs/testing';
import { SavedSearchCronService } from './saved-search-cron.service';
import { SavedSearchService } from './saved-search.service';

describe('SavedSearchCronService', () => {
  let service: SavedSearchCronService;
  let savedSearchService: SavedSearchService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SavedSearchCronService,
        {
          provide: SavedSearchService,
          useValue: {
            notifyForRecentListings: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(SavedSearchCronService);
    savedSearchService = module.get(SavedSearchService);
  });

  it('sweeps recently published listings on a 15 minute lookback', async () => {
    jest
      .spyOn(savedSearchService, 'notifyForRecentListings')
      .mockResolvedValue(3);

    await service.sweepRecentListings();

    expect(savedSearchService.notifyForRecentListings).toHaveBeenCalledWith(15);
  });
});
