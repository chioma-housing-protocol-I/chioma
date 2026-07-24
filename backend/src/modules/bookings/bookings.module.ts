import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { Booking } from './entities/booking.entity';
import { Property } from '../properties/entities/property.entity';
import { PaymentModule } from '../payments/payment.module';
import { StellarModule } from '../stellar/stellar.module';
import { Payment } from '../payments/entities/payment.entity';
import { StellarEscrow } from '../stellar/entities/stellar-escrow.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Booking, Property, Payment, StellarEscrow]),
    PaymentModule,
    StellarModule,
  ],
  controllers: [BookingsController],
  providers: [BookingsService],
  exports: [BookingsService],
})
export class BookingsModule {}
