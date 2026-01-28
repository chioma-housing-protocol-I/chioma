import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentService } from './payment.service';
import {
  PaymentController,
  AgreementPaymentController,
  PaymentMethodController,
  PaymentScheduleController,
} from './payment.controller';
import { PaymentGatewayService } from './payment-gateway.service';
import { Payment } from './entities/payment.entity';
import { PaymentMethod } from './entities/payment-method.entity';
import { PaymentSchedule } from './entities/payment-schedule.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Payment, PaymentMethod, PaymentSchedule]),
    NotificationsModule,
    UsersModule,
  ],
  controllers: [
    PaymentController,
    AgreementPaymentController,
    PaymentMethodController,
    PaymentScheduleController,
  ],
  providers: [PaymentService, PaymentGatewayService],
  exports: [PaymentService, PaymentGatewayService],
})
export class PaymentModule {}
