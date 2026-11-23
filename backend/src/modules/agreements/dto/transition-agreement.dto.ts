import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AgreementStatus } from '../../rent/entities/rent-contract.entity';

export class TransitionAgreementDto {
  @ApiProperty({
    enum: AgreementStatus,
    description: 'Target agreement status for an explicit state transition.',
  })
  @IsEnum(AgreementStatus)
  status: AgreementStatus;

  @ApiPropertyOptional({
    description: 'Optional reason recorded with the transition.',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}
