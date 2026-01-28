import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  Min,
  Max,
  MaxLength,
} from 'class-validator';

export class ResolveDisputeDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  resolution: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(999999999.99)
  refundAmount?: number;
}
