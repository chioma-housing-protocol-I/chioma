import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentService } from './payment.service';
import {
  PaymentController,
  AgreementPaymentController,
  PaymentMethodController,
  PaymentScheduleController,
  PaymentWebhookController,
} from './payment.controller';
import { PaymentGatewayService } from './payment-gateway.service';
import { Payment } from './entities/payment.entity';
import { PaymentMethod } from './entities/payment-method.entity';
import { PaymentSchedule } from './entities/payment-schedule.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { UsersModule } from '../users/users.module';
import { StellarModule } from '../stellar/stellar.module';
import { User } from '../users/entities/user.entity';
import { AdminRefundsController } from './admin-refunds.controller';
import { AdminRefundsService } from './admin-refunds.service';
import { FraudModule } from '../fraud/fraud.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Payment, PaymentMethod, PaymentSchedule, User]),
    NotificationsModule,
    UsersModule,
    StellarModule,
    FraudModule,
  ],
  controllers: [
    PaymentController,
    AgreementPaymentController,
    PaymentMethodController,
    PaymentScheduleController,
    PaymentWebhookController,
    AdminRefundsController,
  ],
  providers: [PaymentService, PaymentGatewayService, AdminRefundsService],
  exports: [PaymentService, PaymentGatewayService],
})
export class PaymentModule {}
