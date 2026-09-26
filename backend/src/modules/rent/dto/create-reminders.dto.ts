import {
  IsDateString,
  IsEmail,
  IsNumber,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CreateRemindersDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'UUID of the rent agreement',
  })
  @IsString()
  agreementId: string;

  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'UUID of the tenant',
  })
  @IsString()
  tenantId: string;

  @ApiProperty({
    example: 'tenant@example.com',
    description: 'Tenant email address for reminder delivery',
  })
  @IsEmail()
  tenantEmail: string;

  @ApiProperty({
    example: '2026-07-01',
    description: 'Rent due date (ISO 8601)',
  })
  @IsDateString()
  dueDate: string;

  @ApiProperty({ example: 1500.0, description: 'Rent amount due', minimum: 0 })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  amount: number;
}
