import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { SearchService } from './search.service';
import { SearchController } from './search.controller';
import { SavedSearchService } from './saved-search.service';
import { SavedSearchController } from './saved-search.controller';
import { SavedSearchCronService } from './saved-search-cron.service';
import { SavedSearch } from './entities/saved-search.entity';
import { Property } from '../properties/entities/property.entity';
import { User } from '../users/entities/user.entity';
import { RentAgreement } from '../rent/entities/rent-contract.entity';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    ScheduleModule,
    TypeOrmModule.forFeature([Property, User, RentAgreement, SavedSearch]),
    NotificationsModule,
  ],
  providers: [SearchService, SavedSearchService, SavedSearchCronService],
  controllers: [SearchController, SavedSearchController],
  exports: [SearchService, SavedSearchService],
})
export class SearchModule {}
