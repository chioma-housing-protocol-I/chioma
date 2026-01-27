import { PartialType } from '@nestjs/mapped-types';
import { CreateAgreementDto } from './create-agreement.dto';
import { IsOptional, IsEnum } from 'class-validator';
import { AgreementStatus } from '../../rent/entities/rent-contract.entity';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateAgreementDto extends PartialType(CreateAgreementDto) {
  @ApiPropertyOptional({
    description: 'Agreement status',
    enum: AgreementStatus,
    example: 'ACTIVE',
  })
  @IsOptional()
  @IsEnum(AgreementStatus)
  status?: AgreementStatus;
}
