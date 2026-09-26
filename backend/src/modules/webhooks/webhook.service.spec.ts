import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import {
  WebhookSignatureService,
  WEBHOOK_SIGNATURE_HEADER,
  WEBHOOK_TIMESTAMP_HEADER,
} from './webhook-signature.service';
import { WebhookSignatureGuard } from './guards/webhook-signature.guard';
import { WEBHOOK_SECRET_METADATA_KEY } from './decorators/webhook-secret.decorator';
import { MetricsService } from '../monitoring/metrics.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SECRET = 'test-secret-key';
const PAYLOAD = '{"event":"payment.received","amount":100}';

function buildTimestamp(offsetMs = 0): string {
  return (Date.now() + offsetMs).toString();
}

// ---------------------------------------------------------------------------
// WebhookSignatureService unit tests
// ---------------------------------------------------------------------------

describe('WebhookSignatureService', () => {
  let service: WebhookSignatureService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WebhookSignatureService],
    }).compile();

    service = module.get<WebhookSignatureService>(WebhookSignatureService);
  });

  afterEach(() => jest.clearAllMocks());

  // ── generateSignature ──────────────────────────────────────────────────────

  describe('generateSignature', () => {
    it('returns a hex string', () => {
      const sig = service.generateSignature(PAYLOAD, '1711453200000', SECRET);
      expect(sig).toMatch(/^[0-9a-f]+$/);
    });

    it('is deterministic for the same inputs', () => {
      const ts = '1711453200000';
      expect(service.generateSignature(PAYLOAD, ts, SECRET)).toBe(
        service.generateSignature(PAYLOAD, ts, SECRET),
      );
    });

    it('differs when payload changes', () => {
      const ts = '1711453200000';
      const s1 = service.generateSignature(PAYLOAD, ts, SECRET);
      const s2 = service.generateSignature('{}', ts, SECRET);
      expect(s1).not.toBe(s2);
    });

    it('differs when timestamp changes', () => {
      const s1 = service.generateSignature(PAYLOAD, '1000', SECRET);
      const s2 = service.generateSignature(PAYLOAD, '2000', SECRET);
      expect(s1).not.toBe(s2);
    });

    it('differs when secret changes', () => {
      const ts = '1711453200000';
      const s1 = service.generateSignature(PAYLOAD, ts, 'secret-one');
      const s2 = service.generateSignature(PAYLOAD, ts, 'secret-two');
      expect(s1).not.toBe(s2);
    });

    it('produces a 64-character hex string (SHA-256 HMAC)', () => {
      const sig = service.generateSignature(PAYLOAD, '1711453200000', SECRET);
      expect(sig).toHaveLength(64);
    });

    it('handles empty payload', () => {
      const sig = service.generateSignature('', '1711453200000', SECRET);
      expect(sig).toHaveLength(64);
    });

    it('handles unicode payload', () => {
      const sig = service.generateSignature('日本語', '1711453200000', SECRET);
      expect(sig).toHaveLength(64);
    });
  });

  // ── createSignedHeaders ────────────────────────────────────────────────────

  describe('createSignedHeaders', () => {
    it('returns Content-Type, X-Webhook-Timestamp, and X-Webhook-Signature', () => {
      const headers = service.createSignedHeaders(PAYLOAD, SECRET);
      expect(headers['Content-Type']).toBe('application/json');
      expect(headers['X-Webhook-Timestamp']).toBeDefined();
      expect(headers['X-Webhook-Signature']).toBeDefined();
    });

    it('timestamp is a recent Unix ms string', () => {
      const before = Date.now();
      const headers = service.createSignedHeaders(PAYLOAD, SECRET);
      const after = Date.now();
      const ts = parseInt(headers['X-Webhook-Timestamp'], 10);
      expect(ts).toBeGreaterThanOrEqual(before);
      expect(ts).toBeLessThanOrEqual(after);
    });

    it('signature is valid and verifiable', () => {
      const headers = service.createSignedHeaders(PAYLOAD, SECRET);
      expect(() =>
        service.verifySignature(
          PAYLOAD,
          headers['X-Webhook-Signature'],
          headers['X-Webhook-Timestamp'],
          SECRET,
        ),
      ).not.toThrow();
    });

    it('produces different signatures on successive calls (fresh timestamp)', async () => {
      const h1 = service.createSignedHeaders(PAYLOAD, SECRET);
      await new Promise((r) => setTimeout(r, 2)); // ensure different ms
      const h2 = service.createSignedHeaders(PAYLOAD, SECRET);
      // Timestamps should differ (or at minimum signatures should differ due to ts)
      expect(h1['X-Webhook-Timestamp'] + h1['X-Webhook-Signature']).not.toBe(
        h2['X-Webhook-Timestamp'] + h2['X-Webhook-Signature'],
      );
    });
  });

  // ── verifySignature ────────────────────────────────────────────────────────

  describe('verifySignature', () => {
    it('does not throw for a valid signature within tolerance', () => {
      const ts = buildTimestamp();
      const sig = service.generateSignature(PAYLOAD, ts, SECRET);
      expect(() =>
        service.verifySignature(PAYLOAD, sig, ts, SECRET),
      ).not.toThrow();
    });

    it('throws UnauthorizedException when signature header is missing', () => {
      expect(() =>
        service.verifySignature(PAYLOAD, undefined, buildTimestamp(), SECRET),
      ).toThrow('Missing webhook signature');
    });

    it('throws UnauthorizedException when timestamp header is missing', () => {
      const ts = buildTimestamp();
      const sig = service.generateSignature(PAYLOAD, ts, SECRET);
      expect(() =>
        service.verifySignature(PAYLOAD, sig, undefined, SECRET),
      ).toThrow('Missing webhook signature');
    });

    it('throws UnauthorizedException when both headers are missing', () => {
      expect(() =>
        service.verifySignature(PAYLOAD, undefined, undefined, SECRET),
      ).toThrow('Missing webhook signature');
    });

    it('throws InternalServerErrorException when secret is undefined', () => {
      const ts = buildTimestamp();
      const sig = service.generateSignature(PAYLOAD, ts, SECRET);
      expect(() =>
        service.verifySignature(PAYLOAD, sig, ts, undefined),
      ).toThrow('Webhook secret misconfigured');
    });

    it('throws InternalServerErrorException when secret is empty string', () => {
      const ts = buildTimestamp();
      const sig = service.generateSignature(PAYLOAD, ts, SECRET);
      expect(() => service.verifySignature(PAYLOAD, sig, ts, '')).toThrow(
        'Webhook secret misconfigured',
      );
    });

    it('throws UnauthorizedException for a non-numeric timestamp', () => {
      const ts = buildTimestamp();
      const sig = service.generateSignature(PAYLOAD, ts, SECRET);
      expect(() =>
        service.verifySignature(PAYLOAD, sig, 'not-a-number', SECRET),
      ).toThrow('Invalid webhook timestamp');
    });

    it('throws UnauthorizedException for a NaN timestamp', () => {
      const ts = buildTimestamp();
      const sig = service.generateSignature(PAYLOAD, ts, SECRET);
      expect(() =>
        service.verifySignature(PAYLOAD, sig, 'NaN', SECRET),
      ).toThrow('Invalid webhook timestamp');
    });

    it('throws UnauthorizedException for a stale timestamp (> 5 min old)', () => {
      const staleTs = buildTimestamp(-6 * 60 * 1000); // 6 minutes ago
      const sig = service.generateSignature(PAYLOAD, staleTs, SECRET);
      expect(() =>
        service.verifySignature(PAYLOAD, sig, staleTs, SECRET),
      ).toThrow('Webhook timestamp expired');
    });

    it('throws UnauthorizedException for a future timestamp beyond tolerance', () => {
      const futureTs = buildTimestamp(6 * 60 * 1000); // 6 minutes in future
      const sig = service.generateSignature(PAYLOAD, futureTs, SECRET);
      expect(() =>
        service.verifySignature(PAYLOAD, sig, futureTs, SECRET),
      ).toThrow('Webhook timestamp expired');
    });

    it('accepts a timestamp at the edge of the tolerance window', () => {
      const edgeTs = buildTimestamp(-4 * 60 * 1000 - 50_000); // ~4m50s ago
      const sig = service.generateSignature(PAYLOAD, edgeTs, SECRET);
      expect(() =>
        service.verifySignature(PAYLOAD, sig, edgeTs, SECRET),
      ).not.toThrow();
    });

    it('throws UnauthorizedException for a wrong signature (all zeros)', () => {
      const ts = buildTimestamp();
      expect(() =>
        service.verifySignature(PAYLOAD, '0'.repeat(64), ts, SECRET),
      ).toThrow('Invalid webhook signature');
    });

    it('throws UnauthorizedException for a signature with wrong length', () => {
      const ts = buildTimestamp();
      expect(() =>
        service.verifySignature(PAYLOAD, 'deadbeef', ts, SECRET),
      ).toThrow('Invalid webhook signature');
    });

    it('throws UnauthorizedException when payload is tampered after signing', () => {
      const ts = buildTimestamp();
      const sig = service.generateSignature(PAYLOAD, ts, SECRET);
      expect(() =>
        service.verifySignature('{"tampered":true}', sig, ts, SECRET),
      ).toThrow('Invalid webhook signature');
    });

    it('throws UnauthorizedException when secret is wrong', () => {
      const ts = buildTimestamp();
      const sig = service.generateSignature(PAYLOAD, ts, SECRET);
      expect(() =>
        service.verifySignature(PAYLOAD, sig, ts, 'wrong-secret'),
      ).toThrow('Invalid webhook signature');
    });

    it('respects a custom toleranceMs of 0 (rejects any non-zero age)', () => {
      const ts = buildTimestamp(-1000); // 1 second ago
      const sig = service.generateSignature(PAYLOAD, ts, SECRET);
      expect(() =>
        service.verifySignature(PAYLOAD, sig, ts, SECRET, 0),
      ).toThrow('Webhook timestamp expired');
    });

    it('respects a custom toleranceMs of 1 hour', () => {
      const ts = buildTimestamp(-30 * 60 * 1000); // 30 min ago
      const sig = service.generateSignature(PAYLOAD, ts, SECRET);
      expect(() =>
        service.verifySignature(PAYLOAD, sig, ts, SECRET, 60 * 60 * 1000),
      ).not.toThrow();
    });

    it('uses timing-safe comparison (no early exit on first byte match)', () => {
      // This is a behavioural test: a signature that shares the first byte
      // but differs elsewhere must still be rejected.
      const ts = buildTimestamp();
      const validSig = service.generateSignature(PAYLOAD, ts, SECRET);
      const almostSig = validSig.slice(0, 2) + 'ff' + validSig.slice(4); // mutate bytes 2-3
      expect(() =>
        service.verifySignature(PAYLOAD, almostSig, ts, SECRET),
      ).toThrow('Invalid webhook signature');
    });

    // ── structured rejection logging ────────────────────────────────────────

    it('emits analyzable structured metadata when a signature is tampered', () => {
      const warnSpy = jest
        .spyOn(
          (service as unknown as { logger: { warn: jest.Mock } }).logger,
          'warn',
        )
        .mockImplementation(() => undefined);

      const ts = buildTimestamp();
      const sig = service.generateSignature(PAYLOAD, ts, SECRET);
      const ctx = {
        ipAddress: '203.0.113.7',
        userAgent: 'tamper-bot/1.0',
        path: '/api/kyc/webhook',
        method: 'POST',
        endpoint: 'KYC_WEBHOOK_SECRET',
      };

      expect(() =>
        service.verifySignature(
          '{"tampered":true}',
          sig,
          ts,
          SECRET,
          undefined,
          ctx,
        ),
      ).toThrow('Invalid webhook signature');

      expect(warnSpy).toHaveBeenCalledTimes(1);
      const [message, metadata] = warnSpy.mock.calls[0];
      expect(String(message)).toContain('signature_mismatch');
      expect(metadata).toMatchObject({
        event: 'webhook_signature_verification',
        outcome: 'rejected',
        reason: 'signature_mismatch',
        receivedSignature: sig,
        receivedTimestamp: ts,
        ipAddress: '203.0.113.7',
        userAgent: 'tamper-bot/1.0',
        path: '/api/kyc/webhook',
        method: 'POST',
        endpoint: 'KYC_WEBHOOK_SECRET',
      });
      // Payload hash lets analysts correlate identical tampered payloads
      expect(metadata.payloadHash).toMatch(/^[0-9a-f]{64}$/);
      // Only a prefix of the locally-computed HMAC is exposed, never the full digest
      expect(metadata.expectedSignaturePrefix).toMatch(/^[0-9a-f]{12}$/);
    });

    it('emits a distinct reason code for each rejection path', () => {
      const warnSpy = jest
        .spyOn(
          (service as unknown as { logger: { warn: jest.Mock } }).logger,
          'warn',
        )
        .mockImplementation(() => undefined);
      const ts = buildTimestamp();
      const sig = service.generateSignature(PAYLOAD, ts, SECRET);

      const expectReason = (reason: string, fn: () => void) => {
        warnSpy.mockClear();
        expect(fn).toThrow();
        expect(warnSpy).toHaveBeenCalledTimes(1);
        expect(warnSpy.mock.calls[0][1]).toMatchObject({ reason });
      };

      expectReason('missing_signature', () =>
        service.verifySignature(PAYLOAD, undefined, ts, SECRET),
      );
      expectReason('missing_timestamp', () =>
        service.verifySignature(PAYLOAD, sig, undefined, SECRET),
      );
      expectReason('invalid_timestamp', () =>
        service.verifySignature(PAYLOAD, sig, 'not-a-number', SECRET),
      );
      expectReason('timestamp_expired', () =>
        service.verifySignature(
          PAYLOAD,
          sig,
          buildTimestamp(-6 * 60 * 1000),
          SECRET,
        ),
      );
      expectReason('signature_mismatch', () =>
        service.verifySignature(PAYLOAD, '0'.repeat(64), ts, SECRET),
      );
    });

    it('logs secret misconfiguration at error level', () => {
      const errorSpy = jest
        .spyOn(
          (service as unknown as { logger: { error: jest.Mock } }).logger,
          'error',
        )
        .mockImplementation(() => undefined);
      const ts = buildTimestamp();
      const sig = service.generateSignature(PAYLOAD, ts, SECRET);

      expect(() =>
        service.verifySignature(PAYLOAD, sig, ts, undefined),
      ).toThrow('Webhook secret misconfigured');

      expect(errorSpy).toHaveBeenCalledTimes(1);
      expect(errorSpy.mock.calls[0][1]).toMatchObject({
        reason: 'secret_not_configured',
      });
    });
  });

  // ── metrics ────────────────────────────────────────────────────────────────

  describe('metrics', () => {
    it('records success when verification passes and MetricsService is available', async () => {
      const recordWebhookSignatureVerification = jest.fn();
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          WebhookSignatureService,
          {
            provide: MetricsService,
            useValue: { recordWebhookSignatureVerification },
          },
        ],
      }).compile();
      const svc = module.get<WebhookSignatureService>(WebhookSignatureService);

      const ts = buildTimestamp();
      const sig = svc.generateSignature(PAYLOAD, ts, SECRET);
      expect(() => svc.verifySignature(PAYLOAD, sig, ts, SECRET)).not.toThrow();

      expect(recordWebhookSignatureVerification).toHaveBeenCalledWith(
        'success',
      );
    });

    it('records the rejection reason when verification fails', async () => {
      const recordWebhookSignatureVerification = jest.fn();
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          WebhookSignatureService,
          {
            provide: MetricsService,
            useValue: { recordWebhookSignatureVerification },
          },
        ],
      }).compile();
      const svc = module.get<WebhookSignatureService>(WebhookSignatureService);

      expect(() =>
        svc.verifySignature(PAYLOAD, '0'.repeat(64), buildTimestamp(), SECRET),
      ).toThrow('Invalid webhook signature');

      expect(recordWebhookSignatureVerification).toHaveBeenCalledWith(
        'signature_mismatch',
      );
    });

    it('does not throw when MetricsService is not provided (optional injection)', () => {
      const ts = buildTimestamp();
      const sig = service.generateSignature(PAYLOAD, ts, SECRET);
      expect(() =>
        service.verifySignature(PAYLOAD, sig, ts, SECRET),
      ).not.toThrow();
    });
  });

  // ── header constant exports ────────────────────────────────────────────────

  describe('exported header constants', () => {
    it('WEBHOOK_SIGNATURE_HEADER is lowercase', () => {
      expect(WEBHOOK_SIGNATURE_HEADER).toBe(
        WEBHOOK_SIGNATURE_HEADER.toLowerCase(),
      );
    });

    it('WEBHOOK_TIMESTAMP_HEADER is lowercase', () => {
      expect(WEBHOOK_TIMESTAMP_HEADER).toBe(
        WEBHOOK_TIMESTAMP_HEADER.toLowerCase(),
      );
    });
  });
});

// ---------------------------------------------------------------------------
// WebhookSignatureGuard unit tests
// ---------------------------------------------------------------------------

describe('WebhookSignatureGuard', () => {
  let guard: WebhookSignatureGuard;
  let signatureService: WebhookSignatureService;
  let reflector: jest.Mocked<Reflector>;
  let configService: jest.Mocked<ConfigService>;

  const buildContext = (
    overrides: Partial<{
      signature: string | undefined;
      timestamp: string | undefined;
      rawBody: string | undefined;
      body: Record<string, unknown>;
      ipAddress: string | undefined;
      userAgent: string | undefined;
      path: string | undefined;
      method: string | undefined;
    }> = {},
  ): ExecutionContext => {
    const req = {
      header: jest.fn((name: string) => {
        const lower = name.toLowerCase();
        if (lower === WEBHOOK_SIGNATURE_HEADER)
          return overrides.signature ?? undefined;
        if (lower === WEBHOOK_TIMESTAMP_HEADER)
          return overrides.timestamp ?? undefined;
        if (lower === 'user-agent') return overrides.userAgent;
        if (lower === 'x-forwarded-for') return overrides.ipAddress;
        if (lower === 'x-real-ip') return overrides.ipAddress;
        return undefined;
      }),
      rawBody: overrides.rawBody,
      body: overrides.body ?? {},
      path: overrides.path,
      method: overrides.method,
      socket: { remoteAddress: overrides.ipAddress },
    };

    return {
      switchToHttp: () => ({ getRequest: () => req }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as unknown as ExecutionContext;
  };

  beforeEach(async () => {
    reflector = {
      getAllAndOverride: jest.fn().mockReturnValue('WEBHOOK_SIGNATURE_SECRET'),
    } as unknown as jest.Mocked<Reflector>;

    configService = {
      get: jest.fn().mockReturnValue(SECRET),
    } as unknown as jest.Mocked<ConfigService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhookSignatureGuard,
        WebhookSignatureService,
        { provide: Reflector, useValue: reflector },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    guard = module.get<WebhookSignatureGuard>(WebhookSignatureGuard);
    signatureService = module.get<WebhookSignatureService>(
      WebhookSignatureService,
    );
  });

  afterEach(() => jest.clearAllMocks());

  it('returns true for a valid signed request using rawBody', () => {
    const ts = buildTimestamp();
    const sig = signatureService.generateSignature(PAYLOAD, ts, SECRET);
    const ctx = buildContext({
      signature: sig,
      timestamp: ts,
      rawBody: PAYLOAD,
    });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('returns true for a valid signed request using JSON.stringify(body)', () => {
    const body = { event: 'payment.received' };
    const bodyStr = JSON.stringify(body);
    const ts = buildTimestamp();
    const sig = signatureService.generateSignature(bodyStr, ts, SECRET);
    const ctx = buildContext({ signature: sig, timestamp: ts, body });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('throws UnauthorizedException when signature header is absent', () => {
    const ctx = buildContext({ timestamp: buildTimestamp(), rawBody: PAYLOAD });
    expect(() => guard.canActivate(ctx)).toThrow('Missing webhook signature');
  });

  it('throws UnauthorizedException when timestamp header is absent', () => {
    const ts = buildTimestamp();
    const sig = signatureService.generateSignature(PAYLOAD, ts, SECRET);
    const ctx = buildContext({ signature: sig, rawBody: PAYLOAD });
    expect(() => guard.canActivate(ctx)).toThrow('Missing webhook signature');
  });

  it('throws UnauthorizedException for an invalid signature', () => {
    const ctx = buildContext({
      signature: '0'.repeat(64),
      timestamp: buildTimestamp(),
      rawBody: PAYLOAD,
    });
    expect(() => guard.canActivate(ctx)).toThrow('Invalid webhook signature');
  });

  it('throws UnauthorizedException for a stale timestamp', () => {
    const staleTs = buildTimestamp(-6 * 60 * 1000);
    const sig = signatureService.generateSignature(PAYLOAD, staleTs, SECRET);
    const ctx = buildContext({
      signature: sig,
      timestamp: staleTs,
      rawBody: PAYLOAD,
    });
    expect(() => guard.canActivate(ctx)).toThrow('Webhook timestamp expired');
  });

  it('throws InternalServerErrorException when config secret is missing', () => {
    configService.get.mockReturnValue(undefined);
    const ts = buildTimestamp();
    const sig = signatureService.generateSignature(PAYLOAD, ts, SECRET);
    const ctx = buildContext({
      signature: sig,
      timestamp: ts,
      rawBody: PAYLOAD,
    });
    expect(() => guard.canActivate(ctx)).toThrow(
      'Webhook secret misconfigured',
    );
  });

  it('uses the config key from the @WebhookSecret decorator', () => {
    reflector.getAllAndOverride.mockReturnValue('KYC_WEBHOOK_SECRET');
    configService.get.mockImplementation((key: string) =>
      key === 'KYC_WEBHOOK_SECRET' ? 'kyc-secret' : undefined,
    );
    const ts = buildTimestamp();
    const sig = signatureService.generateSignature(PAYLOAD, ts, 'kyc-secret');
    const ctx = buildContext({
      signature: sig,
      timestamp: ts,
      rawBody: PAYLOAD,
    });
    expect(guard.canActivate(ctx)).toBe(true);
    expect(configService.get).toHaveBeenCalledWith('KYC_WEBHOOK_SECRET');
  });

  it('falls back to WEBHOOK_SIGNATURE_SECRET when decorator key is not set', () => {
    reflector.getAllAndOverride.mockReturnValue(null);
    const ts = buildTimestamp();
    const sig = signatureService.generateSignature(PAYLOAD, ts, SECRET);
    const ctx = buildContext({
      signature: sig,
      timestamp: ts,
      rawBody: PAYLOAD,
    });
    expect(guard.canActivate(ctx)).toBe(true);
    expect(configService.get).toHaveBeenCalledWith('WEBHOOK_SIGNATURE_SECRET');
  });

  it('prefers rawBody over JSON.stringify(body) for signature verification', () => {
    const ts = buildTimestamp();
    // Sign the rawBody string
    const sig = signatureService.generateSignature(PAYLOAD, ts, SECRET);
    // body is different from rawBody — guard must use rawBody
    const ctx = buildContext({
      signature: sig,
      timestamp: ts,
      rawBody: PAYLOAD,
      body: { different: 'body' },
    });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('WEBHOOK_SECRET_METADATA_KEY constant is defined', () => {
    expect(WEBHOOK_SECRET_METADATA_KEY).toBeDefined();
    expect(typeof WEBHOOK_SECRET_METADATA_KEY).toBe('string');
  });

  it('passes request context (IP, user agent, path, method, endpoint) to the service', () => {
    const ts = buildTimestamp();
    const sig = signatureService.generateSignature(PAYLOAD, ts, SECRET);
    const verifySpy = jest.spyOn(signatureService, 'verifySignature');

    const ctx = buildContext({
      signature: sig,
      timestamp: ts,
      rawBody: PAYLOAD,
      ipAddress: '198.51.100.23',
      userAgent: 'provider-client/2.0',
      path: '/api/screening/webhook',
      method: 'POST',
    });

    expect(guard.canActivate(ctx)).toBe(true);

    const callArgs = verifySpy.mock.calls[0];
    expect(callArgs[5]).toMatchObject({
      ipAddress: '198.51.100.23',
      userAgent: 'provider-client/2.0',
      path: '/api/screening/webhook',
      method: 'POST',
      endpoint: 'WEBHOOK_SIGNATURE_SECRET',
    });
  });

  it('passes the decorator config key as the endpoint context', () => {
    reflector.getAllAndOverride.mockReturnValue('KYC_WEBHOOK_SECRET');
    configService.get.mockImplementation((key: string) =>
      key === 'KYC_WEBHOOK_SECRET' ? 'kyc-secret' : undefined,
    );
    const ts = buildTimestamp();
    const sig = signatureService.generateSignature(PAYLOAD, ts, 'kyc-secret');
    const verifySpy = jest.spyOn(signatureService, 'verifySignature');

    const ctx = buildContext({
      signature: sig,
      timestamp: ts,
      rawBody: PAYLOAD,
    });

    expect(guard.canActivate(ctx)).toBe(true);
    expect(verifySpy.mock.calls[0][5]).toMatchObject({
      endpoint: 'KYC_WEBHOOK_SECRET',
    });
  });
});
