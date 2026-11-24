import {
  Injectable,
  Logger,
  NestMiddleware,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import { NextFunction, Request, Response } from 'express';
import * as StellarSdk from '@stellar/stellar-sdk';

/** Header carrying the signer's Stellar public key (G...). */
export const STELLAR_PUBLIC_KEY_HEADER = 'x-stellar-public-key';
/** Header carrying the base64-encoded ed25519 signature. */
export const STELLAR_SIGNATURE_HEADER = 'x-stellar-signature';
/** Header carrying the signing time as Unix epoch milliseconds. */
export const STELLAR_TIMESTAMP_HEADER = 'x-stellar-timestamp';

/** Domain-separation prefix so these signatures can't be reused elsewhere. */
export const STELLAR_REQUEST_SIGNATURE_VERSION = 'chioma-stellar-request-v1';

const DEFAULT_TOLERANCE_SECONDS = 300;

type RequestWithRawBody = Request & { rawBody?: string };

/**
 * Builds the canonical message a client must sign for a contract request:
 *
 * ```
 * chioma-stellar-request-v1
 * <HTTP METHOD>
 * <request path including query string>
 * <timestamp (epoch ms)>
 * <hex sha256 of the raw request body>
 * ```
 */
export function buildStellarSignaturePayload(
  method: string,
  path: string,
  timestamp: string,
  rawBody: string,
): string {
  const bodyHash = createHash('sha256').update(rawBody, 'utf8').digest('hex');
  return [
    STELLAR_REQUEST_SIGNATURE_VERSION,
    method.toUpperCase(),
    path,
    timestamp,
    bodyHash,
  ].join('\n');
}

/**
 * Signs a request with a Stellar keypair. Intended for clients and tests;
 * the returned value goes in the `X-Stellar-Signature` header.
 */
export function signStellarRequest(
  keypair: StellarSdk.Keypair,
  method: string,
  path: string,
  timestamp: string,
  rawBody: string,
): string {
  const payload = buildStellarSignaturePayload(
    method,
    path,
    timestamp,
    rawBody,
  );
  return keypair.sign(Buffer.from(payload, 'utf8')).toString('base64');
}

/**
 * Verifies Stellar (ed25519) request signatures on state-changing contract
 * endpoints, e.g. `POST /stellar/payment-processing/*`.
 *
 * Every non-GET request must carry `X-Stellar-Public-Key`,
 * `X-Stellar-Signature` and `X-Stellar-Timestamp`. The middleware rejects
 * the request (401) when:
 *  - any header is missing or malformed,
 *  - the timestamp is outside the allowed clock-skew window,
 *  - the signature does not match the canonical payload (forgery/tampering),
 *  - the same signature was already used (replay),
 *  - the signer is not the account the operation acts on (`userAddress` for
 *    rent payments, the platform admin for fee-collector changes).
 *
 * Every accepted and rejected validation is logged.
 */
@Injectable()
export class StellarRequestSignatureMiddleware implements NestMiddleware {
  private readonly logger = new Logger(StellarRequestSignatureMiddleware.name);
  private readonly toleranceMs: number;
  private readonly adminPublicKey?: string;
  /** signature → expiry (epoch ms). Guards against replay within the window. */
  private readonly usedSignatures = new Map<string, number>();

  constructor(private readonly configService: ConfigService) {
    const toleranceSeconds = Number(
      this.configService.get<string>(
        'STELLAR_REQUEST_SIGNATURE_TOLERANCE_SECONDS',
      ) ?? DEFAULT_TOLERANCE_SECONDS,
    );
    this.toleranceMs =
      (Number.isFinite(toleranceSeconds) && toleranceSeconds > 0
        ? toleranceSeconds
        : DEFAULT_TOLERANCE_SECONDS) * 1000;

    const adminSecret = this.configService.get<string>(
      'STELLAR_ADMIN_SECRET_KEY',
    );
    if (adminSecret) {
      try {
        this.adminPublicKey =
          StellarSdk.Keypair.fromSecret(adminSecret).publicKey();
      } catch {
        this.logger.warn(
          'STELLAR_ADMIN_SECRET_KEY is invalid - admin-signed contract requests will be rejected',
        );
      }
    }
  }

  use(req: RequestWithRawBody, _res: Response, next: NextFunction): void {
    // Read-only endpoints don't trigger contract invocations.
    if (req.method === 'GET' || req.method === 'HEAD') {
      next();
      return;
    }

    const path = req.originalUrl ?? req.url;
    const publicKey = req.header(STELLAR_PUBLIC_KEY_HEADER);
    const signature = req.header(STELLAR_SIGNATURE_HEADER);
    const timestamp = req.header(STELLAR_TIMESTAMP_HEADER);

    const reject = (reason: string): UnauthorizedException => {
      this.logger.warn(
        `Stellar request signature rejected: ${reason} ` +
          `(method=${req.method}, path=${path}, publicKey=${publicKey ?? 'none'})`,
      );
      return new UnauthorizedException(
        `Invalid Stellar request signature: ${reason}`,
      );
    };

    if (!publicKey || !signature || !timestamp) {
      throw reject('missing signature headers');
    }

    if (!StellarSdk.StrKey.isValidEd25519PublicKey(publicKey)) {
      throw reject('malformed public key');
    }

    const signedAt = Number(timestamp);
    if (!/^\d+$/.test(timestamp) || !Number.isSafeInteger(signedAt)) {
      throw reject('malformed timestamp');
    }
    const now = Date.now();
    if (Math.abs(now - signedAt) > this.toleranceMs) {
      throw reject('timestamp outside allowed window');
    }

    const rawBody = req.rawBody ?? JSON.stringify(req.body ?? {});
    const payload = buildStellarSignaturePayload(
      req.method,
      path,
      timestamp,
      rawBody,
    );

    let signatureValid = false;
    try {
      const signatureBuffer = Buffer.from(signature, 'base64');
      signatureValid =
        signatureBuffer.length === 64 &&
        StellarSdk.Keypair.fromPublicKey(publicKey).verify(
          Buffer.from(payload, 'utf8'),
          signatureBuffer,
        );
    } catch {
      signatureValid = false;
    }
    if (!signatureValid) {
      throw reject('signature verification failed');
    }

    const expectedSigner = this.resolveExpectedSigner(req);
    if (expectedSigner === null) {
      throw reject('no authorized signer configured for this operation');
    }
    if (expectedSigner !== undefined && expectedSigner !== publicKey) {
      throw reject('signer does not match the account for this operation');
    }

    this.pruneUsedSignatures(now);
    if (this.usedSignatures.has(signature)) {
      throw reject('signature already used (replay)');
    }
    this.usedSignatures.set(signature, signedAt + this.toleranceMs);

    this.logger.log(
      `Stellar request signature verified (method=${req.method}, path=${path}, publicKey=${publicKey})`,
    );
    next();
  }

  /**
   * Returns the public key that must have signed this request:
   *  - a string when the operation is bound to a specific account,
   *  - `null` when it requires a signer that isn't configured,
   *  - `undefined` when any valid signer is acceptable.
   */
  private resolveExpectedSigner(
    req: RequestWithRawBody,
  ): string | null | undefined {
    const path = (req.originalUrl ?? req.url).split('?')[0];

    if (path.endsWith('/fee-collector')) {
      return this.adminPublicKey ?? null;
    }

    const body = req.body as { userAddress?: unknown } | undefined;
    if (typeof body?.userAddress === 'string') {
      return body.userAddress;
    }

    return undefined;
  }

  private pruneUsedSignatures(now: number): void {
    for (const [sig, expiresAt] of this.usedSignatures) {
      if (expiresAt < now) {
        this.usedSignatures.delete(sig);
      }
    }
  }
}
