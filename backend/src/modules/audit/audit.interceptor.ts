import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { AuditService } from './audit.service';
import { AuditAction, AuditStatus } from './entities/audit-log.entity';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const handler = context.getHandler();
    const controller = context.getClass();

    const method = request.method;
    const url = request.url;
    const user = request.user; // Assuming authentication middleware sets this
    const ipAddress = this.getClientIp(request);
    const userAgent = request.get('User-Agent');

    const startTime = Date.now();

    return next.handle().pipe(
      tap(async (data) => {
        const duration = Date.now() - startTime;

        // Log successful operations
        if (this.shouldLogRequest(method, url)) {
          try {
            await this.logRequest(
              method,
              url,
              user,
              ipAddress,
              userAgent,
              AuditStatus.SUCCESS,
              response.statusCode,
              duration,
              data,
            );
          } catch (error) {
            this.logger.error('Failed to log successful request', error);
          }
        }
      }),
      catchError(async (error) => {
        const duration = Date.now() - startTime;

        // Log failed operations
        try {
          await this.logRequest(
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
          );
        } catch (logError) {
          this.logger.error('Failed to log failed request', logError);
        }

        throw error;
      }),
    );
  }

  private shouldLogRequest(method: string, url: string): boolean {
    // Log all non-GET requests and sensitive GET requests
    if (method !== 'GET') return true;

    // Log sensitive GET requests
    const sensitivePaths = ['/users', '/admin', '/audit'];
    return sensitivePaths.some(path => url.includes(path));
  }

  private async logRequest(
    method: string,
    url: string,
    user: any,
    ipAddress: string,
    userAgent: string,
    status: AuditStatus,
    responseStatus: number,
    duration: number,
    responseData?: any,
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

  private getClientIp(request: any): string {
    const xForwardedFor = request.headers['x-forwarded-for'];
    if (xForwardedFor) {
      return xForwardedFor.split(',')[0].trim();
    }
    return request.ip || request.connection.remoteAddress || 'unknown';
  }
}