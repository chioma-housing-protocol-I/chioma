import { IsNumber, Min, IsString, IsNotEmpty } from 'class-validator';

export class ProcessRefundDto {
  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsString()
  @IsNotEmpty()
  reason: string;
}
