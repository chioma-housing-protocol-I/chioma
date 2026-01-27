import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { AuditService } from './audit.service';
import { AuditAction, AuditStatus } from './entities/audit-log.entity';

interface AuthenticatedRequest extends Request {
  user?: { id: string; email: string; [key: string]: unknown };
}

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const response = context.switchToHttp().getResponse<Response>();

    const method = request.method;
    const url = request.url;
    const user = request.user;
    const ipAddress = this.getClientIp(request);
    const userAgent = request.get('User-Agent') || undefined;

    const startTime = Date.now();

    return next.handle().pipe(
      tap((data) => {
        const duration = Date.now() - startTime;

        // Log successful operations
        if (this.shouldLogRequest(method, url)) {
          // Use void to explicitly mark promise as intentionally not awaited
          void this.logRequest(
            method,
            url,
            user,
            ipAddress,
            userAgent,
            AuditStatus.SUCCESS,
            response.statusCode,
            duration,
            data,
          ).catch((error) => {
            this.logger.error('Failed to log successful request', error);
          });
        }
      }),
      catchError((error: Error & { status?: number }) => {
        const duration = Date.now() - startTime;

        // Log failed operations
        // Use void to explicitly mark promise as intentionally not awaited
        void this.logRequest(
          method,
          url,
          user,
          ipAddress,
          userAgent,
          AuditStatus.FAILURE,
          error.status || 500,
          duration,
          null,
          error.message,
        ).catch((logError) => {
          this.logger.error('Failed to log failed request', logError);
        });

        throw error;
      }),
    );
  }

  private shouldLogRequest(method: string, url: string): boolean {
    // Log all non-GET requests and sensitive GET requests
    if (method !== 'GET') return true;

    // Log sensitive GET requests
    const sensitivePaths = ['/users', '/admin', '/audit'];
    return sensitivePaths.some((path) => url.includes(path));
  }

  private async logRequest(
    method: string,
    url: string,
    user: { id?: string; email?: string; [key: string]: unknown } | undefined,
    ipAddress: string,
    userAgent: string | undefined,
    status: AuditStatus,
    responseStatus: number,
    duration: number,
    responseData?: unknown,
    errorMessage?: string,
  ): Promise<void> {
    const auditData = {
      action: this.mapMethodToAction(method),
      entityType: 'API',
      entityId: url,
      performedBy: user?.id,
      ipAddress,
      userAgent,
      status,
      errorMessage,
      metadata: {
        method,
        url,
        responseStatus,
        duration,
        userEmail: user?.email,
        responseSize: responseData ? JSON.stringify(responseData).length : 0,
      },
    };

    await this.auditService.log(auditData);
  }

  private mapMethodToAction(method: string): AuditAction {
    switch (method) {
      case 'POST':
        return AuditAction.CREATE;
      case 'PUT':
      case 'PATCH':
        return AuditAction.UPDATE;
      case 'DELETE':
        return AuditAction.DELETE;
      default:
        return AuditAction.DATA_ACCESS;
    }
  }

  private getClientIp(request: AuthenticatedRequest): string {
    const xForwardedFor = request.headers['x-forwarded-for'];
    if (typeof xForwardedFor === 'string') {
      return xForwardedFor.split(',')[0].trim();
    }
    return request.ip || request.socket?.remoteAddress || 'unknown';
  }
}
