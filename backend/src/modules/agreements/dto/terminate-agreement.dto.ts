import { IsNotEmpty, IsString, IsOptional, IsISO8601 } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TerminateAgreementDto {
  @ApiProperty({
    description: 'Reason for terminating the agreement',
    example: 'Mutual agreement to end lease early',
  })
  @IsNotEmpty()
  @IsString()
  terminationReason: string;

  @ApiPropertyOptional({
    description: 'Additional notes about the termination',
    example: 'Tenant found new job in different city',
  })
  @IsOptional()
  @IsString()
  terminationNotes?: string;

  @ApiPropertyOptional({
    description:
      'Effective date/time of termination, used for prorated rent ' +
      'calculation. Defaults to now if omitted; may be backdated but not ' +
      'set in the future.',
    example: '2026-09-15T00:00:00.000Z',
  })
  @IsOptional()
  @IsISO8601()
  terminationDate?: string;
}
