import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { HttpLog } from '../interfaces/http-log.interface';
import { LoggerService } from '../services/logger.service';

const SENSITIVE_HEADERS = ['authorization', 'cookie'];
// Exact matches are intentional: a broad substring match would redact
// harmless fields such as `tokenType`. Add the concrete credential names we
// expect to see in request and response payloads.
const SENSITIVE_BODY_FIELDS = [
  'password',
  'currentpassword',
  'newpassword',
  'passwordhash',
  'token',
  'accesstoken',
  'refreshtoken',
  'secret',
  'authorization',
  'apikey',
  'api_key',
  'privatekey',
  'private_key',
  'otp',
  'mfacode',
  'backupcode',
  'sessionid',
];
const DEFAULT_SLOW_THRESHOLD =
  Number(process.env.LOG_SLOW_REQUEST_THRESHOLD) || 500;
const MAX_LOGGED_BODY_CHARS = Number(process.env.LOG_MAX_BODY_CHARS) || 4096;

function sanitizeHeaders(headers: Record<string, unknown>) {
  const sanitized: Record<string, unknown> = { ...headers };
  for (const key of Object.keys(sanitized)) {
    if (SENSITIVE_HEADERS.includes(key.toLowerCase())) {
      sanitized[key] = '[REDACTED]';
    }
  }
  return sanitized;
}

export function sanitizeBody(body: unknown): unknown {
  if (!body || typeof body !== 'object') return body;

  const clone: unknown = Array.isArray(body) ? [...body] : { ...body };

  if (typeof clone !== 'object' || clone === null) return clone;

  const cloneObj = clone as Record<string, unknown>;
  for (const key of Object.keys(cloneObj)) {
    if (SENSITIVE_BODY_FIELDS.includes(key.toLowerCase())) {
      cloneObj[key] = '[REDACTED]';
    } else if (typeof cloneObj[key] === 'object') {
      cloneObj[key] = sanitizeBody(cloneObj[key]);
    }
  }

  return clone;
}

/**
 * Response bodies can be large (list endpoints, file downloads). Keep the log
 * record bounded while preserving readable JSON for debugging. Buffers are
 * summarised so binary payloads never land in the logs.
 */
export function sanitizeResponseBody(body: unknown): unknown {
  if (body === null || body === undefined) return null;
  if (Buffer.isBuffer(body)) return `[buffer ${body.length} bytes]`;

  const sanitized = sanitizeBody(body);
  let serialized: string | undefined;
  try {
    serialized =
      typeof sanitized === 'string' ? sanitized : JSON.stringify(sanitized);
  } catch {
    return '[unserializable response body]';
  }
  if (serialized === undefined) return '[unserializable response body]';
  if (serialized.length > MAX_LOGGED_BODY_CHARS) {
    return `${serialized.slice(0, MAX_LOGGED_BODY_CHARS)}...[truncated]`;
  }
  return sanitized;
}

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  constructor(private readonly logger: LoggerService) {}

  use(req: Request, res: Response, next: NextFunction) {
    if (req.path === '/health') return next();

    // Capture what the app actually writes so the log reflects the outgoing
    // body, including responses built through `res.json` rather than `send`.
    let capturedResponseBody: unknown = null;
    const send = res.send;
    if (typeof send === 'function') {
      res.send = ((body?: unknown) => {
        if (capturedResponseBody === null) capturedResponseBody = body;
        return send.call(res, body as never);
      }) as typeof res.send;
    }
    const json = res.json;
    if (typeof json === 'function') {
      res.json = ((body?: unknown) => {
        capturedResponseBody = body;
        return json.call(res, body as never);
      }) as typeof res.json;
    }

    const start = process.hrtime();
    const correlationId =
      (req as Request & { correlationId?: string; requestId?: string })
        .correlationId ||
      (req as Request & { correlationId?: string; requestId?: string })
        .requestId ||
      (req.headers['x-request-id'] as string | undefined) ||
      randomUUID();

    (req as Request & { correlationId?: string }).correlationId = correlationId;
    (req as Request & { requestId?: string }).requestId = correlationId;
    res.setHeader('x-request-id', correlationId);

    const method = req.method;
    const url = req.originalUrl;
    const forwardedFor = req.headers['x-forwarded-for'];
    const ip =
      (typeof forwardedFor === 'string'
        ? forwardedFor.split(',')[0]?.trim()
        : null) ||
      req.socket.remoteAddress ||
      'unknown';

    const userAgent = req.headers['user-agent'] || undefined;
    const requestHeaders = sanitizeHeaders(
      req.headers as Record<string, unknown>,
    );
    const requestBody = sanitizeBody(
      (res.locals as { requestBody?: unknown })?.requestBody ??
        (req as Request & { body?: unknown }).body ??
        null,
    );

    res.on('finish', () => {
      const [sec, nano] = process.hrtime(start);
      const responseTime = Math.round(sec * 1000 + nano / 1e6);

      const statusCode = res.statusCode;
      const rawSize = res.getHeader('content-length');
      const responseSize = Array.isArray(rawSize) ? rawSize.join(',') : rawSize;

      const responseHeaders = sanitizeHeaders(
        res.getHeaders() as Record<string, unknown>,
      );

      let level: HttpLog['level'] = 'INFO';

      if (statusCode >= 500) level = 'ERROR';
      else if (statusCode >= 400) level = 'WARN';
      else if (responseTime > DEFAULT_SLOW_THRESHOLD) level = 'WARN';

      const logPayload: HttpLog = {
        timestamp: new Date().toISOString(),
        level,
        method,
        url,
        statusCode,
        responseTime,
        ip,
        userAgent,
        correlationId,
        requestHeaders,
        requestBody,
        responseHeaders,
        responseBody: sanitizeResponseBody(capturedResponseBody),
        responseSize,
      };

      const message = `${method} ${url}`;
      const meta = { http: logPayload };

      if (level === 'ERROR') {
        this.logger.error(message, meta, 'HTTP');
      } else if (level === 'WARN') {
        this.logger.warn(message, meta, 'HTTP');
      } else {
        this.logger.log(message, meta, 'HTTP');
      }
    });

    next();
  }
}
