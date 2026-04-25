import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { RentAgreement } from './entities/rent-contract.entity';
import { Payment } from './entities/payment.entity';
import { RentReminder } from './entities/rent-reminder.entity';
import { RentService } from './rent.service';
import { RentReminderService } from './rent-reminder.service';
import { RentController } from './rent.controller';
import { RentReconciliationService } from './rent-reconciliation.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { StellarModule } from '../stellar/stellar.module';
import { StellarEscrow } from '../stellar/entities/stellar-escrow.entity';
import { Dispute } from '../disputes/entities/dispute.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      RentAgreement,
      Payment,
      RentReminder,
      StellarEscrow,
      Dispute,
    ]),
    ScheduleModule.forRoot(),
    NotificationsModule,
    StellarModule,
  ],
  providers: [RentService, RentReminderService, RentReconciliationService],
  controllers: [RentController],
  exports: [RentService, RentReminderService, RentReconciliationService],
})
export class RentModule {}
