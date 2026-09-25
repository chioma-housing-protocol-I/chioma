import { IsDateString, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Shared query shape for the GDPR / SOC2 / PCI-DSS compliance report
 * endpoints. Both bounds are optional ISO 8601 dates; the controller
 * defaults `to` to now and `from` to 30 days before `to` when omitted.
 */
export class QueryComplianceReportDto {
  @ApiPropertyOptional({
    description: 'Inclusive report start date (ISO 8601)',
    example: '2026-07-01',
  })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({
    description: 'Inclusive report end date (ISO 8601)',
    example: '2026-08-01',
  })
  @IsOptional()
  @IsDateString()
  to?: string;
}
