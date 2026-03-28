import {
  IsEnum,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsString,
  Min,
  Max,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  PropertyRentalMode,
  CancellationPolicy,
} from '../entities/property.entity';

export class UpdatePropertyModeDto {
  @ApiPropertyOptional({ enum: PropertyRentalMode })
  @IsOptional()
  @IsEnum(PropertyRentalMode)
  rentalMode?: PropertyRentalMode;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  minStayDays?: number;

  @ApiPropertyOptional({ example: 365 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxStayDays?: number;

  @ApiPropertyOptional({ example: 150 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  nightlyRate?: number;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  weeklyDiscount?: number;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  monthlyDiscount?: number;

  @ApiPropertyOptional({ example: 50 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  cleaningFee?: number;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  extraGuestFee?: number;

  @ApiPropertyOptional({ example: 4 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxGuests?: number;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  instantBooking?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  requireGuestVerification?: boolean;

  @ApiPropertyOptional({ example: 4.0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(5)
  minimumGuestRating?: number;

  @ApiPropertyOptional({ enum: CancellationPolicy })
  @IsOptional()
  @IsEnum(CancellationPolicy)
  cancellationPolicy?: CancellationPolicy;

  @ApiPropertyOptional({ example: '15:00' })
  @IsOptional()
  @IsString()
  checkInTime?: string;

  @ApiPropertyOptional({ example: '11:00' })
  @IsOptional()
  @IsString()
  checkOutTime?: string;

  @ApiPropertyOptional({ example: 'lockbox' })
  @IsOptional()
  @IsString()
  checkInMethod?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  sublettingAllowed?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  sublettingApprovalRequired?: boolean;

  @ApiPropertyOptional({ example: 90 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(365)
  sublettingMaxDaysPerYear?: number;

  @ApiPropertyOptional({ example: 60 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  sublettingTenantShare?: number;

  @ApiPropertyOptional({ example: 30 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  sublettingLandlordShare?: number;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  smokingAllowed?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  partiesAllowed?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  childrenAllowed?: boolean;
}

export class SwitchModeDto {
  @ApiPropertyOptional({ enum: PropertyRentalMode })
  @IsEnum(PropertyRentalMode)
  newMode: PropertyRentalMode;
}
