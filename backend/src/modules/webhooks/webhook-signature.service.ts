import {
  Injectable,
  Logger,
  UnauthorizedException,
  InternalServerErrorException,
} from '@nestjs/common';
import * as crypto from 'crypto';

export const WEBHOOK_SIGNATURE_HEADER = 'x-webhook-signature';
export const WEBHOOK_TIMESTAMP_HEADER = 'x-webhook-timestamp';
const DEFAULT_TOLERANCE_MS = 5 * 60 * 1000;

@Injectable()
export class WebhookSignatureService {
  private readonly logger = new Logger(WebhookSignatureService.name);

  generateSignature(
    payload: string,
    timestamp: string,
    secret: string,
  ): string {
    return crypto
      .createHmac('sha256', secret)
      .update(`${timestamp}.${payload}`)
      .digest('hex');
  }

  createSignedHeaders(payload: string, secret: string): Record<string, string> {
    const timestamp = Date.now().toString();
    const signature = this.generateSignature(payload, timestamp, secret);

    return {
      'Content-Type': 'application/json',
      'X-Webhook-Timestamp': timestamp,
      'X-Webhook-Signature': signature,
    };
  }

  verifySignature(
    payload: string,
    signature: string | undefined,
    timestamp: string | undefined,
    secret: string | undefined,
    toleranceMs: number = DEFAULT_TOLERANCE_MS,
  ): void {
    if (!signature || !timestamp) {
      this.logger.warn('Rejected unsigned webhook request');
      throw new UnauthorizedException('Missing webhook signature');
    }

    if (!secret) {
      this.logger.error('Webhook secret is not configured');
      throw new InternalServerErrorException('Webhook secret misconfigured');
    }

    const parsedTimestamp = Number(timestamp);
    if (!Number.isFinite(parsedTimestamp)) {
      this.logger.warn('Rejected webhook with invalid timestamp');
      throw new UnauthorizedException('Invalid webhook timestamp');
    }

    const ageMs = Math.abs(Date.now() - parsedTimestamp);
    if (ageMs > toleranceMs) {
      this.logger.warn(`Rejected stale webhook request (${ageMs}ms old)`);
      throw new UnauthorizedException('Webhook timestamp expired');
    }

    const expectedSignature = this.generateSignature(
      payload,
      timestamp,
      secret,
    );
    const signatureBuffer = Buffer.from(signature, 'hex');
    const expectedBuffer = Buffer.from(expectedSignature, 'hex');

    if (
      signatureBuffer.length !== expectedBuffer.length ||
      !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
    ) {
      this.logger.warn('Rejected webhook with invalid signature');
      throw new UnauthorizedException('Invalid webhook signature');
    }
  }
}
