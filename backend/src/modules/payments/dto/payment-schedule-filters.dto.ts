import { IsOptional, IsString, IsIn } from 'class-validator';
import { PaymentScheduleStatus } from '../entities/payment-schedule.entity';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class PaymentScheduleFiltersDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  agreementId?: string;

  @IsOptional()
  @IsIn([
    PaymentScheduleStatus.ACTIVE,
    PaymentScheduleStatus.PAUSED,
    PaymentScheduleStatus.CANCELED,
    PaymentScheduleStatus.FAILED,
  ])
  status?: PaymentScheduleStatus;
}
