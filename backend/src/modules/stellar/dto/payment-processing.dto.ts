import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumberString } from 'class-validator';

export class ProcessRentPaymentDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  userAddress: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  userSecret: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  agreementId: string;

  @ApiProperty()
  @IsNumberString()
  @IsNotEmpty()
  amount: string;
}

export class SetFeeCollectorDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  collectorAddress: string;
}
