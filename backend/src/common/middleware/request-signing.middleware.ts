import {
  Injectable,
  NestMiddleware,
  ForbiddenException,
  BadRequestException,
  CanActivate,
  ExecutionContext,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request, Response, NextFunction } from 'express';
import * as crypto from 'crypto';
import { REQUEST_SIGNING } from '../constants/security.constants';

/**
 * Extended Request with optional user and apiKey properties
 */
interface AuthenticatedRequest extends Request {
  user?: { id: string; [key: string]: unknown };
  apiKey?: { keyHash: string; [key: string]: unknown };
}

/**
 * Request Signing Middleware
 * Validates HMAC signatures for sensitive operations
 * Prevents replay attacks using timestamp validation
 */
@Injectable()
export class RequestSigningMiddleware implements NestMiddleware {
  use(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
    const signature = req.headers[REQUEST_SIGNING.HEADER_NAME] as string;
    const timestamp = req.headers[REQUEST_SIGNING.TIMESTAMP_HEADER] as string;

    if (!signature || !timestamp) {
      throw new BadRequestException(
        'Request signature and timestamp headers are required',
      );
    }

    // Validate timestamp to prevent replay attacks
    const requestTime = parseInt(timestamp, 10);
    const now = Date.now();

    if (isNaN(requestTime)) {
      throw new BadRequestException('Invalid timestamp format');
    }

    if (Math.abs(now - requestTime) > REQUEST_SIGNING.MAX_TIMESTAMP_DRIFT) {
      throw new ForbiddenException(
        'Request timestamp is too old or too far in the future',
      );
    }

    // Get the signing secret
    const secret = this.getSigningSecret(req);

    if (!secret) {
      throw new ForbiddenException('Unable to verify request signature');
    }

    // Compute expected signature
    const payload = this.buildSignaturePayload(req, timestamp);
    const expectedSignature = this.computeSignature(payload, secret);

    // Compare signatures using timing-safe comparison
    if (!this.timingSafeEqual(signature, expectedSignature)) {
      throw new ForbiddenException('Invalid request signature');
    }

    next();
  }

  /**
   * Build the payload to be signed
   * Includes method, path, timestamp, and body hash
   */
  private buildSignaturePayload(req: Request, timestamp: string): string {
    const method = req.method;
    const path = req.originalUrl;
    const bodyHash = req.body
      ? crypto
          .createHash('sha256')
          .update(JSON.stringify(req.body))
          .digest('hex')
      : '';

    return `${method}\n${path}\n${timestamp}\n${bodyHash}`;
  }

  /**
   * Compute HMAC signature
   */
  private computeSignature(payload: string, secret: string): string {
    return crypto
      .createHmac(REQUEST_SIGNING.ALGORITHM, secret)
      .update(payload)
      .digest('hex');
  }

  /**
   * Get the signing secret for the request
   * Can be user-specific or a global secret
   */
  private getSigningSecret(req: AuthenticatedRequest): string | null {
    // If user has an API key, use that for signing
    if (req.apiKey?.keyHash) {
      return req.apiKey.keyHash;
    }

    // If authenticated user, could use a per-user signing key
    if (req.user?.id) {
      // Use a combination of user ID and app secret
      const userSecret =
        process.env.REQUEST_SIGNING_SECRET || process.env.JWT_SECRET;
      return crypto
        .createHash('sha256')
        .update(`${req.user.id}:${userSecret}`)
        .digest('hex');
    }

    // Fallback to app-level secret
    return process.env.REQUEST_SIGNING_SECRET || null;
  }

  /**
   * Timing-safe string comparison
   */
  private timingSafeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);

    return crypto.timingSafeEqual(bufA, bufB);
  }
}

/**
 * Utility class for generating request signatures (for client-side use)
 */
export class RequestSigner {
  constructor(private readonly secret: string) {}

  /**
   * Generate signature for a request
   */
  sign(
    method: string,
    path: string,
    body?: any,
  ): { signature: string; timestamp: string } {
    const timestamp = Date.now().toString();
    const bodyHash = body
      ? crypto.createHash('sha256').update(JSON.stringify(body)).digest('hex')
      : '';

    const payload = `${method}\n${path}\n${timestamp}\n${bodyHash}`;

    const signature = crypto
      .createHmac(REQUEST_SIGNING.ALGORITHM, this.secret)
      .update(payload)
      .digest('hex');

    return { signature, timestamp };
  }
}

/**
 * Decorator to apply request signing validation to specific routes
 */
export const REQUIRE_SIGNATURE_KEY = 'requireSignature';
export const RequireSignature = () => SetMetadata(REQUIRE_SIGNATURE_KEY, true);

/**
 * Guard version of request signing (for use with @UseGuards)
 */
@Injectable()
export class RequestSigningGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requireSignature = this.reflector.get<boolean>(
      REQUIRE_SIGNATURE_KEY,
      context.getHandler(),
    );

    if (!requireSignature) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const signature = request.headers[REQUEST_SIGNING.HEADER_NAME] as string;
    const timestamp = request.headers[
      REQUEST_SIGNING.TIMESTAMP_HEADER
    ] as string;

    if (!signature || !timestamp) {
      throw new BadRequestException(
        'Request signature and timestamp headers are required',
      );
    }

    const requestTime = parseInt(timestamp, 10);
    const now = Date.now();

    if (
      isNaN(requestTime) ||
      Math.abs(now - requestTime) > REQUEST_SIGNING.MAX_TIMESTAMP_DRIFT
    ) {
      throw new ForbiddenException('Invalid or expired timestamp');
    }

    const secret = this.getSigningSecret(request);
    if (!secret) {
      throw new ForbiddenException('Unable to verify signature');
    }

    const method = request.method;
    const path = request.originalUrl;
    const bodyHash = request.body
      ? crypto
          .createHash('sha256')
          .update(JSON.stringify(request.body))
          .digest('hex')
      : '';

    const payload = `${method}\n${path}\n${timestamp}\n${bodyHash}`;
    const expectedSignature = crypto
      .createHmac(REQUEST_SIGNING.ALGORITHM, secret)
      .update(payload)
      .digest('hex');

    if (signature.length !== expectedSignature.length) {
      throw new ForbiddenException('Invalid signature');
    }

    const isValid = crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature),
    );

    if (!isValid) {
      throw new ForbiddenException('Invalid signature');
    }

    return true;
  }

  private getSigningSecret(request: AuthenticatedRequest): string | null {
    if (request.apiKey?.keyHash) {
      return request.apiKey.keyHash;
    }

    if (request.user?.id) {
      const userSecret =
        process.env.REQUEST_SIGNING_SECRET || process.env.JWT_SECRET;
      return crypto
        .createHash('sha256')
        .update(`${request.user.id}:${userSecret}`)
        .digest('hex');
    }

    return process.env.REQUEST_SIGNING_SECRET || null;
  }
}
