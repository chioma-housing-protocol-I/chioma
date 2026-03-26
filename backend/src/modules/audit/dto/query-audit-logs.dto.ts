import {
  IsOptional,
  IsString,
  IsDateString,
  IsEnum,
  IsUUID,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import {
  AuditAction,
  AuditLevel,
  AuditStatus,
} from '../entities/audit-log.entity';

export class QueryAuditLogsDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsUUID()
  performedBy?: string;

  @IsOptional()
  @IsString()
  entityType?: string;

  @IsOptional()
  @IsString()
  entityId?: string;

  @IsOptional()
  @IsEnum(AuditAction)
  action?: AuditAction;

  @IsOptional()
  @IsEnum(AuditStatus)
  status?: AuditStatus;

  @IsOptional()
  @IsEnum(AuditLevel)
  level?: AuditLevel;

  @IsOptional()
  @Transform(({ value }) => value?.toLowerCase())
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @Transform(({ value }) => parseInt(value))
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @Transform(({ value }) => parseInt(value))
  limit?: number = 50;
}
