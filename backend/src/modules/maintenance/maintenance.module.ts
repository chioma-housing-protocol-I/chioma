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
import { PaymentModule } from '../payments/payment.module';
import { Vendor } from './entities/vendor.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([MaintenanceRequest, Vendor]),
    StorageModule,
    NotificationsModule,
    ReviewsModule,
    PropertiesModule,
    UsersModule,
    PaymentModule,
  ],
  providers: [MaintenanceService],
  controllers: [MaintenanceController],
  exports: [MaintenanceService],
})
export class MaintenanceModule {}
