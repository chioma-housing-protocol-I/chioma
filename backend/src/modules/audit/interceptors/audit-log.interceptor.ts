import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { AuditService } from '../audit.service';
import {
  AuditAction,
  AuditLevel,
  AuditStatus,
} from '../entities/audit-log.entity';
import {
  AUDIT_LOG_KEY,
  AuditLogOptions,
} from '../decorators/audit-log.decorator';

interface AuthenticatedRequest extends Request {
  user?: { id: string; email: string; [key: string]: unknown };
}

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditLogInterceptor.name);

  constructor(
    private readonly auditService: AuditService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const auditOptions = this.reflector.get<AuditLogOptions>(
      AUDIT_LOG_KEY,
      context.getHandler(),
    );

    if (!auditOptions) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;
    const ipAddress = this.getClientIp(request);
    const userAgent = request.get('User-Agent') || undefined;

    const args = context.getArgs();
    const methodArgs = args.slice(1) as unknown[]; // Skip ExecutionContext

    return next.handle().pipe(
      tap((result: unknown) => {
        // Use void to explicitly mark promise as intentionally not awaited
        void this.logOperation(
          auditOptions,
          methodArgs,
          result,
          user,
          ipAddress,
          userAgent,
          AuditStatus.SUCCESS,
        ).catch((error) => {
          this.logger.error('Failed to log successful operation', error);
        });
      }),
      catchError((error: Error) => {
        // Use void to explicitly mark promise as intentionally not awaited
        void this.logOperation(
          auditOptions,
          methodArgs,
          null,
          user,
          ipAddress,
          userAgent,
          AuditStatus.FAILURE,
          error.message,
        ).catch((logError) => {
          this.logger.error('Failed to log failed operation', logError);
        });
        throw error;
      }),
    );
  }

  private async logOperation(
    options: AuditLogOptions,
    methodArgs: unknown[],
    result: unknown,
    user: { id?: string; email?: string; [key: string]: unknown } | undefined,
    ipAddress: string,
    userAgent: string | undefined,
    status: AuditStatus,
    errorMessage?: string,
  ): Promise<void> {
    const entityId = this.extractEntityId(methodArgs, result);
    const oldValues = options.includeOldValues
      ? this.extractOldValues(methodArgs)
      : undefined;
    const newValues = options.includeNewValues
      ? this.extractNewValues(methodArgs, result)
      : undefined;

    const level =
      options.level ||
      (status === AuditStatus.FAILURE ? AuditLevel.ERROR : AuditLevel.INFO);

    await this.auditService.log({
      action: options.action as AuditAction,
      entityType: options.entityType,
      entityId,
      oldValues: options.sensitive ? this.sanitizeData(oldValues) : oldValues,
      newValues: options.sensitive ? this.sanitizeData(newValues) : newValues,
      performedBy: user?.id,
      ipAddress,
      userAgent,
      status,
      level,
      errorMessage,
      metadata: {
        method: 'decorated_operation',
        sensitive: options.sensitive,
      },
    });
  }

  private extractEntityId(
    args: unknown[],
    result: unknown,
  ): string | undefined {
    // Try to extract ID from method arguments or result
    for (const arg of args) {
      if (
        arg &&
        typeof arg === 'object' &&
        'id' in arg &&
        typeof (arg as { id: unknown }).id === 'string'
      ) {
        return (arg as { id: string }).id;
      }
    }
    if (
      result &&
      typeof result === 'object' &&
      'id' in result &&
      typeof (result as { id: unknown }).id === 'string'
    ) {
      return (result as { id: string }).id;
    }
    return undefined;
  }

  private extractOldValues(
    args: unknown[],
  ): Record<string, unknown> | undefined {
    // Look for existing entity in arguments
    for (const arg of args) {
      if (
        arg &&
        typeof arg === 'object' &&
        'id' in arg &&
        !('password' in arg)
      ) {
        return arg as Record<string, unknown>;
      }
    }
    return undefined;
  }

  private extractNewValues(
    args: unknown[],
    result: unknown,
  ): Record<string, unknown> | undefined {
    if (result && typeof result === 'object' && 'id' in result) {
      return result as Record<string, unknown>;
    }
    // Look for update DTO in arguments
    for (const arg of args) {
      if (
        arg &&
        typeof arg === 'object' &&
        !('id' in arg) &&
        Object.keys(arg as Record<string, unknown>).length > 0
      ) {
        return arg as Record<string, unknown>;
      }
    }
    return undefined;
  }

  private sanitizeData(data: unknown): Record<string, unknown> | undefined {
    if (!data || typeof data !== 'object') {
      return data as Record<string, unknown> | undefined;
    }

    const sanitized = { ...(data as Record<string, unknown>) };
    const sensitiveFields = [
      'password',
      'token',
      'secret',
      'key',
      'privateKey',
      'ssn',
      'creditCard',
    ];

    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  private getClientIp(request: AuthenticatedRequest): string {
    const xForwardedFor = request.headers['x-forwarded-for'];
    if (typeof xForwardedFor === 'string') {
      return xForwardedFor.split(',')[0].trim();
    }
    return request.ip || request.socket?.remoteAddress || 'unknown';
  }
}
