import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsString, IsUUID, IsOptional } from 'class-validator';

export class RequestSublettingDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'UUID of the original rent agreement',
  })
  @IsUUID()
  agreementId: string;

  @ApiProperty({
    example: '2026-09-01',
    description: 'Start date of the sublet period (ISO 8601)',
  })
  @IsDateString()
  startDate: string;

  @ApiProperty({
    example: '2027-02-28',
    description: 'End date of the sublet period (ISO 8601)',
  })
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional({
    example: 'Temporary relocation for work — will return after 6 months',
    description: 'Reason for requesting subletting',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}
