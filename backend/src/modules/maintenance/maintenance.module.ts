import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MaintenanceRequest } from './maintenance-request.entity';
import { MaintenanceService } from './maintenance.service';
import { MaintenanceController } from './maintenance.controller';
import { StorageModule } from '../storage/storage.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ReviewsModule } from '../reviews/reviews.module';
import { PropertiesModule } from '../properties/properties.module';
import { UsersModule } from '../users/users.module';
import { AutoRecoveryService } from './auto-recovery.service';
import { HealthRecoveryService } from './health-recovery.service';
import { TerminusModule } from '@nestjs/terminus';

@Module({
  imports: [
    TypeOrmModule.forFeature([MaintenanceRequest]),
    StorageModule,
    NotificationsModule,
    ReviewsModule,
    PropertiesModule,
    UsersModule,
    TerminusModule,
  ],
  providers: [MaintenanceService, AutoRecoveryService, HealthRecoveryService],
  controllers: [MaintenanceController],
  exports: [MaintenanceService, AutoRecoveryService, HealthRecoveryService],
})
export class MaintenanceModule {}
