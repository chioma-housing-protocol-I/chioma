import {
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSettlementOfferDto {
  @ApiProperty({
    example: 'Landlord refunds $500 of the deposit within 7 days.',
    maxLength: 2000,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  terms: string;

  @ApiPropertyOptional({ example: 500, minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(999999999.99)
  amount?: number;
}

export const SETTLEMENT_RESPONSES = ['accept', 'reject', 'counter'] as const;
export type SettlementResponseAction = (typeof SETTLEMENT_RESPONSES)[number];

export class RespondSettlementOfferDto {
  @ApiProperty({ enum: SETTLEMENT_RESPONSES })
  @IsIn(SETTLEMENT_RESPONSES)
  action: SettlementResponseAction;

  @ApiPropertyOptional({ description: 'Optional note to the other party' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;

  @ApiPropertyOptional({ description: 'Counter terms (required to counter)' })
  @ValidateIf((o: RespondSettlementOfferDto) => o.action === 'counter')
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  terms?: string;

  @ApiPropertyOptional({ description: 'Counter amount' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(999999999.99)
  amount?: number;
}
