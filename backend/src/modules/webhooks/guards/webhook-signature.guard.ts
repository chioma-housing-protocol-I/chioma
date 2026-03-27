import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import {
  WEBHOOK_SIGNATURE_HEADER,
  WEBHOOK_TIMESTAMP_HEADER,
  WebhookSignatureService,
} from '../webhook-signature.service';
import { WEBHOOK_SECRET_METADATA_KEY } from '../decorators/webhook-secret.decorator';

type RequestWithRawBody = Request & { rawBody?: string };

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

    this.webhookSignatureService.verifySignature(
      payload,
      signature,
      timestamp,
      secret,
    );

    return true;
  }
}
