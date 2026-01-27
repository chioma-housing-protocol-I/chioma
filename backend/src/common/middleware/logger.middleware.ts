import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { HttpLog } from '../interfaces/http-log.interface';
import {
  SENSITIVE_HEADERS,
  SENSITIVE_LOG_FIELDS,
} from '../constants/security.constants';

const DEFAULT_SLOW_THRESHOLD =
  Number(process.env.LOG_SLOW_REQUEST_THRESHOLD) || 500;

/**
 * Mask a value showing only first and last N characters
 */
function maskValue(value: string, showChars = 4): string {
  if (value.length <= showChars * 2) {
    return '[REDACTED]';
  }
  return `${value.substring(0, showChars)}...${value.substring(value.length - showChars)}`;
}

/**
 * Mask an email address showing only domain
 */
function maskEmail(email: string): string {
  const atIndex = email.indexOf('@');
  if (atIndex === -1) return '[REDACTED]';
  return `***@${email.substring(atIndex + 1)}`;
}

/**
 * Mask a wallet address (Stellar G... addresses)
 */
function maskWalletAddress(address: string): string {
  if (address.length < 10) return '[REDACTED]';
  return `${address.substring(0, 4)}...${address.substring(address.length - 4)}`;
}

/**
 * Mask IP address in production
 */
function maskIp(ip: string | undefined): string {
  if (!ip) return 'unknown';
  if (process.env.NODE_ENV !== 'production') return ip;

  // Mask last octet for IPv4
  if (ip.includes('.')) {
    const parts = ip.split('.');
    parts[parts.length - 1] = 'xxx';
    return parts.join('.');
  }

  // Mask for IPv6
  return ip.substring(0, ip.length / 2) + '...';
}

function sanitizeHeaders(
  headers: Record<string, string | string[] | undefined>,
): Record<string, string | string[] | undefined> {
  const sanitized: Record<string, string | string[] | undefined> = {
    ...headers,
  };
  for (const key of Object.keys(sanitized)) {
    if (SENSITIVE_HEADERS.includes(key.toLowerCase())) {
      sanitized[key] = '[REDACTED]';
    }
  }
  return sanitized;
}

export function sanitizeBody(body: unknown, depth = 0): unknown {
  // Prevent infinite recursion
  if (depth > 10) return '[MAX_DEPTH_EXCEEDED]';
  if (!body || typeof body !== 'object') return body;

  // Handle arrays separately
  if (Array.isArray(body)) {
    return body.map((item: unknown) => sanitizeBody(item, depth + 1));
  }

  // Use a Map to avoid prototype pollution and property injection
  const result: Record<string, unknown> = {};

  const bodyRecord = body as Record<string, unknown>;
  // Get own property names safely
  const keys = Object.keys(bodyRecord).filter((key) =>
    Object.prototype.hasOwnProperty.call(bodyRecord, key),
  );

  for (const key of keys) {
    // Validate key is a safe string
    if (
      typeof key !== 'string' ||
      key === '__proto__' ||
      key === 'constructor' ||
      key === 'prototype'
    ) {
      continue;
    }

    const value = bodyRecord[key];
    const lowerKey = key.toLowerCase();

    // Check if field is sensitive
    if (SENSITIVE_LOG_FIELDS.some((field) => lowerKey.includes(field))) {
      result[key] = '[REDACTED]';
    }
    // Mask email fields
    else if (lowerKey.includes('email') && typeof value === 'string') {
      result[key] = maskEmail(value);
    }
    // Mask wallet/address fields (Stellar addresses start with G)
    else if (
      (lowerKey.includes('wallet') ||
        lowerKey.includes('address') ||
        lowerKey.includes('publickey')) &&
      typeof value === 'string' &&
      value.startsWith('G')
    ) {
      result[key] = maskWalletAddress(value);
    }
    // Mask phone numbers
    else if (lowerKey.includes('phone') && typeof value === 'string') {
      result[key] = maskValue(value, 2);
    }
    // Recursively sanitize nested objects
    else if (typeof value === 'object' && value !== null) {
      result[key] = sanitizeBody(value, depth + 1);
    }
    // Copy other values as-is
    else {
      result[key] = value;
    }
  }

  return result;
}

interface RequestWithCorrelation extends Request {
  correlationId?: string;
}

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  use(req: RequestWithCorrelation, res: Response, next: NextFunction): void {
    if (req.path === '/health') return next();

    const start = process.hrtime();
    const correlationId =
      (req.headers['x-request-id'] as string) || randomUUID();

    req.correlationId = correlationId;
    res.setHeader('x-request-id', correlationId);

    const method = req.method;
    const url = req.originalUrl;
    const rawIp =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      req.socket.remoteAddress;
    const ip = maskIp(rawIp);

    const userAgent = req.headers['user-agent'];
    const requestHeaders = sanitizeHeaders(req.headers);
    const requestBody = sanitizeBody(
      (res.locals['requestBody'] as unknown) ?? req.body ?? null,
    );

    res.on('finish', () => {
      const [sec, nano] = process.hrtime(start);
      const responseTime = Math.round(sec * 1000 + nano / 1e6);

      const statusCode = res.statusCode;
      const rawSize = res.getHeader('content-length');
      const responseSize = Array.isArray(rawSize) ? rawSize.join(',') : rawSize;

      const responseHeaders = sanitizeHeaders(
        res.getHeaders() as Record<string, string | string[] | undefined>,
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
