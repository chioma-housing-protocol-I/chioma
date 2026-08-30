import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
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
import { MaintenanceSlaService } from './maintenance-sla.service';
import { TerminusModule } from '@nestjs/terminus';
import { HealthModule } from '../../health/health.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([MaintenanceRequest]),
    StorageModule,
    NotificationsModule,
    ReviewsModule,
    PropertiesModule,
    UsersModule,
    TerminusModule,
    HealthModule,
    ScheduleModule.forRoot(),
  ],
  providers: [
    MaintenanceService,
    AutoRecoveryService,
    HealthRecoveryService,
    MaintenanceSlaService,
  ],
  controllers: [MaintenanceController],
  exports: [
    MaintenanceService,
    AutoRecoveryService,
    HealthRecoveryService,
    MaintenanceSlaService,
  ],
})
export class MaintenanceModule {}
