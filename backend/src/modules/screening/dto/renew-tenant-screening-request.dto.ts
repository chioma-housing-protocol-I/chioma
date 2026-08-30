import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ScreeningCheckType } from '../screening.enums';

export class RenewTenantScreeningRequestDto {
  @ApiPropertyOptional({
    example: ['IDENTITY', 'CRIMINAL', 'EVICTION'],
    enum: ScreeningCheckType,
    isArray: true,
    description:
      'Types of screening checks to perform. If not provided, uses original checks.',
  })
  @IsOptional()
  @IsEnum(ScreeningCheckType, { each: true })
  requestedChecks?: ScreeningCheckType[];

  @ApiPropertyOptional({
    example: 'Updated applicant information',
    description: 'Additional notes for the renewal request',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
