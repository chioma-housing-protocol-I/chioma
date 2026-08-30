import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { Property } from '../properties/entities/property.entity';
import { PropertyInquiry } from '../inquiries/entities/property-inquiry.entity';
import { SubletBooking } from '../subletting/entities/sublet-booking.entity';
import { Payment } from '../payments/entities/payment.entity';
import { AuditLog } from '../audit/entities/audit-log.entity';
import { QueuesModule } from '../queues/queues.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Property,
      PropertyInquiry,
      SubletBooking,
      Payment,
      AuditLog,
    ]),
    QueuesModule,
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
