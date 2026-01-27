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
  @Transform(({ value }: { value: unknown }) => {
    if (typeof value === 'string') {
      return value.toLowerCase();
    }
    return value as string | undefined;
  })
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @Transform(({ value }: { value: unknown }) => {
    if (typeof value === 'string' || typeof value === 'number') {
      return parseInt(String(value), 10);
    }
    return value as number | undefined;
  })
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @Transform(({ value }: { value: unknown }) => {
    if (typeof value === 'string' || typeof value === 'number') {
      return parseInt(String(value), 10);
    }
    return value as number | undefined;
  })
  limit?: number = 50;
}
