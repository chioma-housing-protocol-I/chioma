import {
  IsOptional,
  IsString,
  IsDateString,
  IsIn,
  IsUUID,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

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
  @IsIn([
    'CREATE',
    'UPDATE',
    'DELETE',
    'LOGIN',
    'LOGOUT',
    'PASSWORD_CHANGE',
    'PERMISSION_CHANGE',
    'DATA_ACCESS',
    'CONFIG_CHANGE',
  ])
  action?: string;

  @IsOptional()
  @IsIn(['SUCCESS', 'FAILURE'])
  status?: string;

  @IsOptional()
  @IsIn(['INFO', 'WARN', 'ERROR', 'SECURITY'])
  level?: string;

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
