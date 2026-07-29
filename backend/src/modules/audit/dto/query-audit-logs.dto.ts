import {
  IsOptional,
  IsString,
  IsDateString,
  IsEnum,
  IsUUID,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  AuditAction,
  AuditLevel,
  AuditStatus,
} from '../entities/audit-log.entity';

export class QueryAuditLogsDto {
  @ApiPropertyOptional({ example: '2026-06-01T00:00:00Z', description: 'Start date for filtering audit logs (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-07-01T00:00:00Z', description: 'End date for filtering audit logs (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ example: '123e4567-e89b-12d3-a456-426614174000', description: 'UUID of the user who performed the action' })
  @IsOptional()
  @IsUUID()
  performedBy?: string;

  @ApiPropertyOptional({ example: 'agreement', description: 'Type of entity the action was performed on' })
  @IsOptional()
  @IsString()
  entityType?: string;

  @ApiPropertyOptional({ example: '123e4567-e89b-12d3-a456-426614174000', description: 'UUID of the entity the action was performed on' })
  @IsOptional()
  @IsString()
  entityId?: string;

  @ApiPropertyOptional({ example: 'CREATE', enum: AuditAction, description: 'Filter by audit action type' })
  @IsOptional()
  @IsEnum(AuditAction)
  action?: AuditAction;

  @ApiPropertyOptional({ example: 'SUCCESS', enum: AuditStatus, description: 'Filter by audit status' })
  @IsOptional()
  @IsEnum(AuditStatus)
  status?: AuditStatus;

  @ApiPropertyOptional({ example: 'WARNING', enum: AuditLevel, description: 'Filter by audit severity level' })
  @IsOptional()
  @IsEnum(AuditLevel)
  level?: AuditLevel;

  @ApiPropertyOptional({ example: 'payment failed', description: 'Free-text search within audit log entries' })
  @IsOptional()
  @Transform(({ value }) => value?.toLowerCase())
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: 1, description: 'Page number for pagination' })
  @IsOptional()
  @Type(() => Number)
  @Transform(({ value }) => parseInt(value))
  page?: number = 1;

  @ApiPropertyOptional({ example: 50, description: 'Number of results per page' })
  @IsOptional()
  @Type(() => Number)
  @Transform(({ value }) => parseInt(value))
  limit?: number = 50;
}
