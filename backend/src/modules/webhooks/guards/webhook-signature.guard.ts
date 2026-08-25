import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
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
  constructor(
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
    private readonly webhookSignatureService: WebhookSignatureService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
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

    const verificationContext: WebhookVerificationContext = {
      ipAddress: extractClientIp(request),
      userAgent: request.header('user-agent'),
      path: request.path,
      method: request.method,
      endpoint: secretConfigKey,
    };

    this.webhookSignatureService.verifySignature(
      payload,
      signature,
      timestamp,
      secret,
      undefined,
      verificationContext,
    );

    return true;
  }
}
