import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { AuditService } from '../audit.service';
import { AuditAction, AuditLevel, AuditStatus } from '../entities/audit-log.entity';
import { AUDIT_LOG_KEY, AuditLogOptions } from '../decorators/audit-log.decorator';

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditLogInterceptor.name);

  constructor(
    private readonly auditService: AuditService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const auditOptions = this.reflector.get<AuditLogOptions>(AUDIT_LOG_KEY, context.getHandler());

    if (!auditOptions) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const ipAddress = this.getClientIp(request);
    const userAgent = request.get('User-Agent');

    const args = context.getArgs();
    const methodArgs = args.slice(1); // Skip ExecutionContext

    return next.handle().pipe(
      tap(async (result) => {
        try {
          await this.logOperation(
            auditOptions,
            methodArgs,
            result,
            user,
            ipAddress,
            userAgent,
            AuditStatus.SUCCESS,
          );
        } catch (error) {
          this.logger.error('Failed to log successful operation', error);
        }
      }),
      catchError(async (error) => {
        try {
          await this.logOperation(
            auditOptions,
            methodArgs,
            null,
            user,
            ipAddress,
            userAgent,
            AuditStatus.FAILURE,
            error.message,
          );
        } catch (logError) {
          this.logger.error('Failed to log failed operation', logError);
        }
        throw error;
      }),
    );
  }

  private async logOperation(
    options: AuditLogOptions,
    methodArgs: any[],
    result: any,
    user: any,
    ipAddress: string,
    userAgent: string,
    status: AuditStatus,
    errorMessage?: string,
  ): Promise<void> {
    const entityId = this.extractEntityId(methodArgs, result);
    const oldValues = options.includeOldValues ? this.extractOldValues(methodArgs) : undefined;
    const newValues = options.includeNewValues ? this.extractNewValues(methodArgs, result) : undefined;

    const level = options.level || (status === AuditStatus.FAILURE ? AuditLevel.ERROR : AuditLevel.INFO);

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

  private extractEntityId(args: any[], result: any): string | undefined {
    // Try to extract ID from method arguments or result
    for (const arg of args) {
      if (arg && typeof arg === 'object' && arg.id) {
        return arg.id;
      }
    }
    if (result && typeof result === 'object' && result.id) {
      return result.id;
    }
    return undefined;
  }

  private extractOldValues(args: any[]): any {
    // Look for existing entity in arguments
    for (const arg of args) {
      if (arg && typeof arg === 'object' && arg.id && !arg.password) {
        return arg;
      }
    }
    return undefined;
  }

  private extractNewValues(args: any[], result: any): any {
    if (result && typeof result === 'object' && result.id) {
      return result;
    }
    // Look for update DTO in arguments
    for (const arg of args) {
      if (arg && typeof arg === 'object' && !arg.id && Object.keys(arg).length > 0) {
        return arg;
      }
    }
    return undefined;
  }

  private sanitizeData(data: any): any {
    if (!data || typeof data !== 'object') return data;

    const sanitized = { ...data };
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'privateKey', 'ssn', 'creditCard'];

    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  private getClientIp(request: any): string {
    const xForwardedFor = request.headers['x-forwarded-for'];
    if (xForwardedFor) {
      return xForwardedFor.split(',')[0].trim();
    }
    return request.ip || request.connection.remoteAddress || 'unknown';
  }
}