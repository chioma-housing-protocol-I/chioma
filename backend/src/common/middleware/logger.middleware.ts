import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { HttpLog } from '../interfaces/http-log.interface';

const SENSITIVE_HEADERS = ['authorization', 'cookie'];
const SENSITIVE_BODY_FIELDS = ['password', 'token', 'secret'];
const DEFAULT_SLOW_THRESHOLD =
  Number(process.env.LOG_SLOW_REQUEST_THRESHOLD) || 500;

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

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    if (req.path === '/health') return next();

    const start = process.hrtime();
    const correlationId =
      (req.headers['x-request-id'] as string | undefined) || randomUUID();

    (req as Request & { correlationId?: string }).correlationId = correlationId;
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
        responseSize,
      };

      const isProd = process.env.NODE_ENV === 'production';

      if (isProd) {
        console.log(JSON.stringify(logPayload));
      } else {
        console.log(
          `[${logPayload.timestamp}] ${level}: ${method} ${url} - ${statusCode} - ${responseTime}ms - IP: ${ip} - reqId: ${correlationId}`,
        );
      }
    });

    next();
  }
}
