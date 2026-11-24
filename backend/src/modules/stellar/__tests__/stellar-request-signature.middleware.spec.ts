import { Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import * as StellarSdk from '@stellar/stellar-sdk';
import {
  STELLAR_PUBLIC_KEY_HEADER,
  STELLAR_SIGNATURE_HEADER,
  STELLAR_TIMESTAMP_HEADER,
  StellarRequestSignatureMiddleware,
  signStellarRequest,
} from '../middleware/stellar-request-signature.middleware';

const RENT_PATH = '/api/v1/stellar/payment-processing/rent';
const FEE_COLLECTOR_PATH = '/api/v1/stellar/payment-processing/fee-collector';

interface BuildRequestOptions {
  method?: string;
  path?: string;
  body?: Record<string, unknown>;
  headers?: Record<string, string | undefined>;
}

function buildRequest({
  method = 'POST',
  path = RENT_PATH,
  body = {},
  headers = {},
}: BuildRequestOptions): Request & { rawBody?: string } {
  const normalized: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(headers)) {
    normalized[key.toLowerCase()] = value;
  }
  return {
    method,
    originalUrl: path,
    url: path,
    body,
    rawBody: JSON.stringify(body),
    header: (name: string) => normalized[name.toLowerCase()],
  } as unknown as Request & { rawBody?: string };
}

function signedHeaders(
  keypair: StellarSdk.Keypair,
  method: string,
  path: string,
  body: Record<string, unknown>,
  timestamp = Date.now().toString(),
): Record<string, string> {
  return {
    [STELLAR_PUBLIC_KEY_HEADER]: keypair.publicKey(),
    [STELLAR_TIMESTAMP_HEADER]: timestamp,
    [STELLAR_SIGNATURE_HEADER]: signStellarRequest(
      keypair,
      method,
      path,
      timestamp,
      JSON.stringify(body),
    ),
  };
}

describe('StellarRequestSignatureMiddleware', () => {
  const admin = StellarSdk.Keypair.random();
  const user = StellarSdk.Keypair.random();
  const attacker = StellarSdk.Keypair.random();

  let middleware: StellarRequestSignatureMiddleware;
  let next: jest.Mock;
  let warnSpy: jest.SpyInstance;
  let logSpy: jest.SpyInstance;
  const res = {} as Response;

  const rentBody = () => ({
    userAddress: user.publicKey(),
    userSecret: user.secret(),
    agreementId: 'agreement-1',
    amount: '1000',
  });

  beforeEach(() => {
    const config = {
      get: jest.fn((key: string) =>
        key === 'STELLAR_ADMIN_SECRET_KEY' ? admin.secret() : undefined,
      ),
    } as unknown as ConfigService;
    middleware = new StellarRequestSignatureMiddleware(config);
    next = jest.fn();
    warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('accepts a correctly signed rent payment and logs the validation', () => {
    const body = rentBody();
    const req = buildRequest({
      body,
      headers: signedHeaders(user, 'POST', RENT_PATH, body),
    });

    middleware.use(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('Stellar request signature verified'),
    );
  });

  it('skips verification for read-only GET requests', () => {
    const req = buildRequest({
      method: 'GET',
      path: '/api/v1/stellar/payment-processing/count',
    });

    middleware.use(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  it('rejects requests without signature headers', () => {
    const req = buildRequest({ body: rentBody() });

    expect(() => middleware.use(req, res, next)).toThrow(
      UnauthorizedException,
    );
    expect(next).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('missing signature headers'),
    );
  });

  it('rejects a forged signature made with a different key', () => {
    const body = rentBody();
    const forged = signedHeaders(attacker, 'POST', RENT_PATH, body);
    const req = buildRequest({
      body,
      headers: {
        ...forged,
        // Claim to be the user while signing with the attacker's key.
        [STELLAR_PUBLIC_KEY_HEADER]: user.publicKey(),
      },
    });

    expect(() => middleware.use(req, res, next)).toThrow(
      'signature verification failed',
    );
    expect(next).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('signature verification failed'),
    );
  });

  it('rejects a random, non-ed25519 signature', () => {
    const body = rentBody();
    const req = buildRequest({
      body,
      headers: {
        ...signedHeaders(user, 'POST', RENT_PATH, body),
        [STELLAR_SIGNATURE_HEADER]: Buffer.from('forged').toString('base64'),
      },
    });

    expect(() => middleware.use(req, res, next)).toThrow(
      UnauthorizedException,
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects a request whose body was tampered with after signing', () => {
    const body = rentBody();
    const headers = signedHeaders(user, 'POST', RENT_PATH, body);
    const req = buildRequest({
      body: { ...body, amount: '999999' },
      headers,
    });

    expect(() => middleware.use(req, res, next)).toThrow(
      'signature verification failed',
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects a validly signed request from a key other than userAddress', () => {
    const body = rentBody();
    const req = buildRequest({
      body,
      headers: signedHeaders(attacker, 'POST', RENT_PATH, body),
    });

    expect(() => middleware.use(req, res, next)).toThrow(
      'signer does not match',
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects an expired timestamp', () => {
    const body = rentBody();
    const stale = (Date.now() - 10 * 60 * 1000).toString();
    const req = buildRequest({
      body,
      headers: signedHeaders(user, 'POST', RENT_PATH, body, stale),
    });

    expect(() => middleware.use(req, res, next)).toThrow(
      'timestamp outside allowed window',
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects a replayed signature', () => {
    const body = rentBody();
    const headers = signedHeaders(user, 'POST', RENT_PATH, body);

    middleware.use(buildRequest({ body, headers }), res, next);
    expect(next).toHaveBeenCalledTimes(1);

    expect(() =>
      middleware.use(buildRequest({ body, headers }), res, next),
    ).toThrow('replay');
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('requires the platform admin to sign fee-collector changes', () => {
    const body = { collectorAddress: StellarSdk.Keypair.random().publicKey() };

    expect(() =>
      middleware.use(
        buildRequest({
          path: FEE_COLLECTOR_PATH,
          body,
          headers: signedHeaders(user, 'POST', FEE_COLLECTOR_PATH, body),
        }),
        res,
        next,
      ),
    ).toThrow('signer does not match');
    expect(next).not.toHaveBeenCalled();

    middleware.use(
      buildRequest({
        path: FEE_COLLECTOR_PATH,
        body,
        headers: signedHeaders(admin, 'POST', FEE_COLLECTOR_PATH, body),
      }),
      res,
      next,
    );
    expect(next).toHaveBeenCalledTimes(1);
  });
});
