import {
  Injectable,
  Logger,
  UnauthorizedException,
  InternalServerErrorException,
  Optional,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { MetricsService } from '../monitoring/metrics.service';
import {
  SecurityEventSeverity,
  SecurityEventType,
} from '../security/entities/security-event.entity';
import { SecurityEventsService } from '../security/security-events.service';

export const WEBHOOK_SIGNATURE_HEADER = 'x-webhook-signature';
export const WEBHOOK_TIMESTAMP_HEADER = 'x-webhook-timestamp';
const DEFAULT_TOLERANCE_MS = 5 * 60 * 1000;

/**
 * Number of leading characters of the locally-computed HMAC included in
 * rejection logs. Full digests are never logged — the prefix is enough to
 * spot a client using a different secret or key rotation drift while keeping
 * log exposure minimal.
 */
const EXPECTED_SIGNATURE_PREFIX_LENGTH = 12;

/**
 * Machine-readable rejection reasons. Logs are emitted with one of these in
 * the `reason` field so analysis tooling can filter, aggregate and alert on
 * tampering / replay attempts without parsing free-form messages.
 */
export const WEBHOOK_SIGNATURE_REJECTION_REASONS = {
  MISSING_SIGNATURE: 'missing_signature',
  MISSING_TIMESTAMP: 'missing_timestamp',
  SECRET_NOT_CONFIGURED: 'secret_not_configured',
  INVALID_TIMESTAMP: 'invalid_timestamp',
  TIMESTAMP_EXPIRED: 'timestamp_expired',
  SIGNATURE_MISMATCH: 'signature_mismatch',
} as const;

export type WebhookSignatureRejectionReason =
  (typeof WEBHOOK_SIGNATURE_REJECTION_REASONS)[keyof typeof WEBHOOK_SIGNATURE_REJECTION_REASONS];

/**
 * Request-level context attached to every verification log. This is what turns
 * a bare "invalid signature" line into an analyzable record (which endpoint was
 * probed, from which IP, with which client).
 */
export interface WebhookVerificationContext {
  /** Client IP address, when it can be determined. */
  ipAddress?: string;
  /** Value of the `User-Agent` request header. */
  userAgent?: string;
  /** Request path (e.g. `/api/kyc/webhook`). */
  path?: string;
  /** HTTP method (e.g. `POST`). */
  method?: string;
  /** Logical webhook endpoint identifier (e.g. the secret config key). */
  endpoint?: string;
}

/** Shape of the structured log record emitted for every verification attempt. */
export interface WebhookSignatureVerificationLog {
  event: 'webhook_signature_verification';
  outcome: 'success' | 'rejected';
  reason?: WebhookSignatureRejectionReason;
  /** The signature received from the caller (attacker-controlled, safe to log). */
  receivedSignature?: string;
  /** Leading characters of the locally-computed HMAC, for comparison. */
  expectedSignaturePrefix?: string;
  /** SHA-256 digest of the raw payload, for correlating repeated payloads. */
  payloadHash?: string;
  /** Value of the `x-webhook-timestamp` header as received. */
  receivedTimestamp?: string;
  /** Signed clock skew in ms (positive = received timestamp is in the past). */
  timestampSkewMs?: number;
  ipAddress?: string;
  userAgent?: string;
  path?: string;
  method?: string;
  endpoint?: string;
}

@Injectable()
export class WebhookSignatureService {
  private readonly logger = new Logger(WebhookSignatureService.name);

  constructor(
    @Optional() private readonly metricsService?: MetricsService,
    @Optional() private readonly securityEventsService?: SecurityEventsService,
  ) {}

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
    secret: string | readonly string[] | undefined,
    toleranceMs: number = DEFAULT_TOLERANCE_MS,
    context: WebhookVerificationContext = {},
  ): void {
    if (!signature || !timestamp) {
      const reason = !signature
        ? WEBHOOK_SIGNATURE_REJECTION_REASONS.MISSING_SIGNATURE
        : WEBHOOK_SIGNATURE_REJECTION_REASONS.MISSING_TIMESTAMP;
      this.logRejection(
        reason,
        'Rejected unsigned webhook request',
        payload,
        signature,
        timestamp,
        context,
      );
      throw new UnauthorizedException('Missing webhook signature');
    }

    const secrets = (Array.isArray(secret) ? secret : [secret]).filter(
      (value): value is string => Boolean(value),
    );
    const secrets = this.resolveSecrets(secret);
    if (secrets.length === 0) {
      this.logRejection(
        WEBHOOK_SIGNATURE_REJECTION_REASONS.SECRET_NOT_CONFIGURED,
        'Webhook secret is not configured',
        payload,
        signature,
        timestamp,
        context,
      );
      throw new InternalServerErrorException('Webhook secret misconfigured');
    }

    const parsedTimestamp = Number(timestamp);
    if (!Number.isFinite(parsedTimestamp)) {
      this.logRejection(
        WEBHOOK_SIGNATURE_REJECTION_REASONS.INVALID_TIMESTAMP,
        'Rejected webhook with invalid timestamp',
        payload,
        signature,
        timestamp,
        context,
      );
      throw new UnauthorizedException('Invalid webhook timestamp');
    }

    const timestampSkewMs = Date.now() - parsedTimestamp;
    if (Math.abs(timestampSkewMs) > toleranceMs) {
      this.logRejection(
        WEBHOOK_SIGNATURE_REJECTION_REASONS.TIMESTAMP_EXPIRED,
        `Rejected webhook with expired timestamp (${Math.abs(timestampSkewMs)}ms skew)`,
        payload,
        signature,
        timestamp,
        context,
        { timestampSkewMs },
      );
      throw new UnauthorizedException('Webhook timestamp expired');
    }

    const signatureBuffer = Buffer.from(signature, 'hex');
    let expectedSignature = '';
    let matched = false;
    for (const candidateSecret of secrets) {
      const candidateSignature = this.generateSignature(
    const matchingSecret = secrets.find((candidateSecret) => {
      const expectedSignature = this.generateSignature(
        payload,
        timestamp,
        candidateSecret,
      );
      const expectedBuffer = Buffer.from(candidateSignature, 'hex');
      const candidateMatched =
        signatureBuffer.length === expectedBuffer.length &&
        crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
      matched = candidateMatched || matched;
      if (!expectedSignature) expectedSignature = candidateSignature;
    }

    if (!matched) {
      const signatureBuffer = Buffer.from(signature, 'hex');
      const expectedBuffer = Buffer.from(expectedSignature, 'hex');

      return (
        signatureBuffer.length === expectedBuffer.length &&
        crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
      );
    });

    if (!matchingSecret) {
      const expectedSignature = this.generateSignature(
        payload,
        timestamp,
        secrets[0],
      );
      this.logRejection(
        WEBHOOK_SIGNATURE_REJECTION_REASONS.SIGNATURE_MISMATCH,
        'Rejected webhook with invalid signature',
        payload,
        signature,
        timestamp,
        context,
        {
          expectedSignaturePrefix: expectedSignature.slice(
            0,
            EXPECTED_SIGNATURE_PREFIX_LENGTH,
          ),
        },
      );
      throw new UnauthorizedException('Invalid webhook signature');
    }

    this.metricsService?.recordWebhookSignatureVerification('success');
  }

  /**
   * Emit a structured, machine-analyzable rejection log and record the
   * corresponding failure metric. Every field is chosen so that security
   * tooling can correlate attempts (same IP / payload / signature across
   * endpoints) without requiring the raw payload body in the log.
   */
  private logRejection(
    reason: WebhookSignatureRejectionReason,
    message: string,
    payload: string,
    signature: string | undefined,
    timestamp: string | undefined,
    context: WebhookVerificationContext,
    extra: Partial<WebhookSignatureVerificationLog> = {},
  ): void {
    const metadata: WebhookSignatureVerificationLog = {
      event: 'webhook_signature_verification',
      outcome: 'rejected',
      reason,
      receivedSignature: signature,
      payloadHash: this.hashPayload(payload),
      receivedTimestamp: timestamp,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      path: context.path,
      method: context.method,
      endpoint: context.endpoint,
      ...extra,
    };

    if (reason === WEBHOOK_SIGNATURE_REJECTION_REASONS.SECRET_NOT_CONFIGURED) {
      this.logger.error(
        `Webhook signature verification failed [${reason}]: ${message}`,
        metadata,
      );
    } else {
      this.logger.warn(
        `Webhook signature verification failed [${reason}]: ${message}`,
        metadata,
      );
    }

    this.recordSecurityEvent(reason, message, context, metadata);
    this.metricsService?.recordWebhookSignatureVerification(reason);
  }

  private resolveSecrets(secret: string | undefined): string[] {
    const trimmed = secret?.trim();
    if (!trimmed) {
      return [];
    }

    if (trimmed.startsWith('[')) {
      try {
        const candidate = JSON.parse(trimmed);
        if (Array.isArray(candidate)) {
          return candidate
            .map((value) => String(value).trim())
            .filter((value) => value.length > 0);
        }
      } catch {
        // Fall back to comma-separated parsing below.
      }
    }

    return trimmed
      .split(',')
      .map((value) => value.trim())
      .filter((value) => value.length > 0);
  }

  private recordSecurityEvent(
    reason: WebhookSignatureRejectionReason,
    message: string,
    context: WebhookVerificationContext,
    metadata: WebhookSignatureVerificationLog,
  ): void {
    if (!this.securityEventsService) {
      return;
    }

    void this.securityEventsService
      .createEvent({
        eventType: SecurityEventType.SUSPICIOUS_ACTIVITY,
        severity:
          reason === WEBHOOK_SIGNATURE_REJECTION_REASONS.SECRET_NOT_CONFIGURED
            ? SecurityEventSeverity.CRITICAL
            : reason === WEBHOOK_SIGNATURE_REJECTION_REASONS.SIGNATURE_MISMATCH
              ? SecurityEventSeverity.HIGH
              : SecurityEventSeverity.MEDIUM,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        details: {
          event: metadata.event,
          reason,
          path: context.path,
          method: context.method,
          endpoint: context.endpoint,
          receivedTimestamp: metadata.receivedTimestamp,
          payloadHash: metadata.payloadHash,
          expectedSignaturePrefix: metadata.expectedSignaturePrefix,
          timestampSkewMs: metadata.timestampSkewMs,
        },
        success: false,
        errorMessage: message,
      })
      .catch((error: unknown) => {
        this.logger.warn(
          'Failed to record webhook signature security event',
          error instanceof Error ? error.message : String(error),
        );
      });
  }

  private hashPayload(payload: string): string {
    return crypto.createHash('sha256').update(payload).digest('hex');
  }
}
