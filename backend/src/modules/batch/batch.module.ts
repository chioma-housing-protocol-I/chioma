import { Module } from '@nestjs/common';
import { FavoritesModule } from '../favorites/favorites.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { BatchController } from './batch.controller';
import { BatchService } from './batch.service';

@Module({
  imports: [FavoritesModule, NotificationsModule],
  controllers: [BatchController],
  providers: [BatchService],
})
export class BatchModule {}
