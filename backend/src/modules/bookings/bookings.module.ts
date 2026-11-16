import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { Booking } from './entities/booking.entity';
import { Property } from '../properties/entities/property.entity';
import { PaymentModule } from '../payments/payment.module';
import { StellarModule } from '../stellar/stellar.module';
import { StellarEscrow } from '../stellar/entities/stellar-escrow.entity';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Booking, Property, StellarEscrow]),
    PaymentModule,
    StellarModule,
    NotificationsModule,
    BullModule.registerQueue({ name: 'email' }),
  ],
  controllers: [BookingsController],
  providers: [BookingsService],
  exports: [BookingsService],
})
export class BookingsModule {}
