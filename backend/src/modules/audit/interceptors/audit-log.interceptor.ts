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
import {
  AuditAction,
  AuditLevel,
  AuditStatus,
} from '../entities/audit-log.entity';
import {
  AUDIT_LOG_KEY,
  AuditLogOptions,
} from '../decorators/audit-log.decorator';

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditLogInterceptor.name);

  constructor(
    private readonly auditService: AuditService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const auditOptions = this.reflector.get<AuditLogOptions>(
      AUDIT_LOG_KEY,
      context.getHandler(),
    );

    if (!auditOptions) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const ipAddress = this.getClientIp(request);
    const userAgent = request.get('User-Agent');

    return next.handle().pipe(
      tap((result) => {
        this.logOperation(
          auditOptions,
          request,
          result,
          user,
          ipAddress,
          userAgent,
          AuditStatus.SUCCESS,
        ).catch((error) => {
          this.logger.error('Failed to log successful operation', error);
        });
      }),
      catchError((error) => {
        this.logOperation(
          auditOptions,
          request,
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
    request: any,
    result: any,
    user: any,
    ipAddress: string,
    userAgent: string,
    status: AuditStatus,
    errorMessage?: string,
  ): Promise<void> {
    const entityId = this.extractEntityId(request, result);
    const oldValues = options.includeOldValues
      ? this.extractOldValues(request)
      : undefined;
    const newValues = options.includeNewValues
      ? this.extractNewValues(request, result)
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
        method: request.method,
        path: request.originalUrl || request.url,
        sensitive: options.sensitive,
      },
    });
  }

  private extractEntityId(request: any, result: any): string | undefined {
    return (
      request.params?.id ||
      request.params?.userId ||
      request.params?.entityId ||
      request.body?.id ||
      result?.id ||
      result?.paymentId ||
      undefined
    );
  }

  private extractOldValues(request: any): any {
    // We cannot reliably fetch full pre-image in a generic interceptor.
    // Capture key request context and rely on service-level logs where needed.
    return request.params && Object.keys(request.params).length > 0
      ? { params: request.params }
      : undefined;
  }

  private extractNewValues(request: any, result: any): any {
    if (result && typeof result === 'object' && result.id) {
      return result;
    }

    if (request.body && Object.keys(request.body).length > 0) {
      return request.body;
    }

    return undefined;
  }

  private sanitizeData(data: any): any {
    if (!data || typeof data !== 'object') return data;

    const sanitized = { ...data };
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
