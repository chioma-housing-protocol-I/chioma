import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RentAgreement } from './entities/rent-contract.entity';
import { Payment } from './entities/payment.entity';
import { RentReminder } from './entities/rent-reminder.entity';
import { RentService } from './rent.service';
import { RentReminderService } from './rent-reminder.service';
import { RentController } from './rent.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([RentAgreement, Payment, RentReminder]),
    NotificationsModule,
  ],
  providers: [RentService, RentReminderService],
  controllers: [RentController],
  exports: [RentService, RentReminderService],
})
export class RentModule {}
