import { Module } from '@nestjs/common';
import { FavoritesModule } from '../favorites/favorites.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { FavoritesNotificationsBatchController } from './favorites-notifications-batch.controller';
import { FavoritesNotificationsBatchService } from './favorites-notifications-batch.service';

@Module({
  imports: [FavoritesModule, NotificationsModule],
  controllers: [FavoritesNotificationsBatchController],
  providers: [FavoritesNotificationsBatchService],
})
export class FavoritesNotificationsBatchModule {}
