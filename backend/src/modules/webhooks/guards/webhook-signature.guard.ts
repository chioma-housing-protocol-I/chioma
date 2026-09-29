import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import {
  WEBHOOK_SIGNATURE_HEADER,
  WEBHOOK_TIMESTAMP_HEADER,
  WebhookSignatureService,
  WebhookVerificationContext,
} from '../webhook-signature.service';
import { WEBHOOK_SECRET_METADATA_KEY } from '../decorators/webhook-secret.decorator';
import { SecurityEventsService } from '../../security/security-events.service';
import {
  SecurityEventSeverity,
  SecurityEventType,
} from '../../security/entities/security-event.entity';

type RequestWithRawBody = Request & { rawBody?: string };

/**
 * Best-effort client IP extraction. Honors the standard proxy headers used by
 * the app (see ThreatDetectionService) and falls back to the socket address.
 */
function extractClientIp(request: Request): string | undefined {
  const forwarded = request.header('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0]?.trim();
  }
  return request.header('x-real-ip') ?? request.socket?.remoteAddress;
}

@Injectable()
export class WebhookSignatureGuard implements CanActivate {
  private readonly logger = new Logger(WebhookSignatureGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
    private readonly webhookSignatureService: WebhookSignatureService,
    private readonly securityEventsService: SecurityEventsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithRawBody>();
    const secretConfigKey =
      this.reflector.getAllAndOverride<string>(WEBHOOK_SECRET_METADATA_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) || 'WEBHOOK_SIGNATURE_SECRET';

    const signature = request.header(WEBHOOK_SIGNATURE_HEADER);
    const timestamp = request.header(WEBHOOK_TIMESTAMP_HEADER);
    const payload = request.rawBody ?? JSON.stringify(request.body ?? {});
    const secret = this.configService.get<string>(secretConfigKey);
    const previousSecret = this.configService.get<string>(
      `${secretConfigKey}_PREVIOUS`,
    );

    const verificationContext: WebhookVerificationContext = {
      ipAddress: extractClientIp(request),
      userAgent: request.header('user-agent'),
      path: request.path,
      method: request.method,
      endpoint: secretConfigKey,
    };

    try {
      this.webhookSignatureService.verifySignature(
        payload,
        signature,
        timestamp,
        [secret, previousSecret],
        undefined,
        verificationContext,
      );
    } catch (error) {
      try {
        await this.securityEventsService.createEvent({
          eventType: SecurityEventType.SUSPICIOUS_ACTIVITY,
          severity: SecurityEventSeverity.HIGH,
          ipAddress: verificationContext.ipAddress,
          userAgent: verificationContext.userAgent,
          success: false,
          errorMessage:
            error instanceof Error
              ? error.message
              : 'Webhook verification failed',
          details: {
            category: 'webhook_signature_rejected',
            endpoint: secretConfigKey,
            path: verificationContext.path,
            method: verificationContext.method,
          },
        });
      } catch (recordError) {
        this.logger.error(
          'Failed to persist rejected webhook signature security event',
          recordError instanceof Error ? recordError.stack : undefined,
        );
      }
      throw error;
    }

    return true;
  }
}
