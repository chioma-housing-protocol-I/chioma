import { IsBoolean, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ActivateAgreementDto {
  @ApiPropertyOptional({
    description:
      'When true (default), activation requires start date reached and escrow/security deposit conditions to be satisfied.',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  enforcePreconditions?: boolean;
}
