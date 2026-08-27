import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum AdminUserSortField {
  CREATED_AT = 'createdAt',
  EMAIL = 'email',
  FIRST_NAME = 'firstName',
  LAST_NAME = 'lastName',
  ROLE = 'role',
}

export class AdminUserQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({ description: 'Filter by user role' })
  @IsOptional()
  @IsString()
  role?: string;

  @ApiPropertyOptional({
    description: 'Search by email, first name, or last name',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by email verification status' })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  isVerified?: boolean;

  @ApiPropertyOptional({
    description: 'Field to sort by',
    enum: AdminUserSortField,
    default: AdminUserSortField.CREATED_AT,
  })
  @IsOptional()
  @IsEnum(AdminUserSortField)
  sortBy?: AdminUserSortField = AdminUserSortField.CREATED_AT;

  @ApiPropertyOptional({
    description: 'Sort direction',
    enum: ['ASC', 'DESC'],
    default: 'DESC',
  })
  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}
