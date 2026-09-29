import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SavedSearchService } from './saved-search.service';

/** Safety-net window covering the gap between two runs of this cron. */
const LOOKBACK_MINUTES = 15;

@Injectable()
export class SavedSearchCronService {
  private readonly logger = new Logger(SavedSearchCronService.name);

  constructor(private readonly savedSearchService: SavedSearchService) {}

  /**
   * Catches saved-search matches for listings published outside the
   * publish-time hook (e.g. a transient failure, direct DB writes, imports).
   */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async sweepRecentListings(): Promise<void> {
    const notified =
      await this.savedSearchService.notifyForRecentListings(LOOKBACK_MINUTES);
    if (notified > 0) {
      this.logger.log(`Saved search sweep sent ${notified} notification(s)`);
    }
  }
}
