import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ResolveDisputeDto {
  @ApiProperty({
    example:
      'After reviewing the evidence, the landlord agrees to refund $750 of the security deposit. Both parties have signed the settlement agreement.',
    description: 'Final resolution details',
    maxLength: 2000,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  resolution: string;

  @ApiPropertyOptional({
    example: 750.0,
    description: 'Refund amount agreed upon in the resolution',
    minimum: 0,
    maximum: 999999999.99,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(999999999.99)
  refundAmount?: number;
}
