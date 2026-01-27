import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Request } from 'express';
import { SecurityAuditService } from '../services/security-audit.service';

/**
 * Suspicious Activity Guard
 * Detects and blocks suspicious activity patterns
 */
@Injectable()
export class SuspiciousActivityGuard implements CanActivate {
  private readonly logger = new Logger(SuspiciousActivityGuard.name);

  // Track request patterns per IP
  private readonly requestPatterns = new Map<
    string,
    {
      requests: { timestamp: number; path: string; method: string }[];
      blocked: boolean;
      blockedUntil?: number;
    }
  >();

  // Configuration
  private readonly MAX_REQUESTS_PER_MINUTE = 100;
  private readonly BLOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes
  private readonly PATTERN_WINDOW_MS = 60 * 1000; // 1 minute

  private readonly SUSPICIOUS_PATTERNS = [
    /\/\.\./g, // Path traversal
    /admin|phpmyadmin|wp-admin/i, // Admin probing
    /<script/i, // XSS attempts in URL
    /union.*select/i, // SQL injection
    new RegExp(String.fromCharCode(0), 'g'), // Null byte injection (intentional security check)
  ];

  constructor(private readonly securityAuditService: SecurityAuditService) {
    // Clean up old entries periodically
    setInterval(() => this.cleanup(), 60000);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const ip = this.getClientIp(request);
    const path = request.originalUrl || request.url;
    const method = request.method;

    // Check if IP is blocked
    if (this.isBlocked(ip)) {
      throw new ForbiddenException(
        'Access temporarily blocked due to suspicious activity',
      );
    }

    // Check for suspicious URL patterns
    if (this.hasSuspiciousPattern(path)) {
      this.blockIp(ip, 'Suspicious URL pattern detected');
      await this.securityAuditService.logSuspiciousActivity(
        'Suspicious URL pattern',
        { path, method },
        ip,
      );
      throw new ForbiddenException('Invalid request');
    }

    // Track request and check for rate anomalies
    this.trackRequest(ip, path, method);

    if (this.isRequestRateAnomalous(ip)) {
      this.blockIp(ip, 'Abnormal request rate');
      await this.securityAuditService.logSuspiciousActivity(
        'Abnormal request rate',
        { requestsPerMinute: this.getRequestCount(ip) },
        ip,
      );
      throw new ForbiddenException('Too many requests. Please slow down.');
    }

    // Check for scanning behavior
    if (this.isScanning(ip)) {
      await this.securityAuditService.logSuspiciousActivity(
        'Possible vulnerability scanning detected',
        { uniquePaths: this.getUniquePaths(ip).length },
        ip,
      );
    }

    return true;
  }

  private getClientIp(request: Request): string {
    const forwarded = request.headers['x-forwarded-for'];
    const forwardedIp =
      typeof forwarded === 'string'
        ? forwarded.split(',')[0]?.trim()
        : undefined;
    return (
      forwardedIp ||
      (request.headers['x-real-ip'] as string) ||
      request.socket?.remoteAddress ||
      'unknown'
    );
  }

  private isBlocked(ip: string): boolean {
    const pattern = this.requestPatterns.get(ip);
    if (!pattern?.blocked) return false;

    if (pattern.blockedUntil && Date.now() > pattern.blockedUntil) {
      // Unblock if time has passed
      pattern.blocked = false;
      pattern.blockedUntil = undefined;
      return false;
    }

    return true;
  }

  private blockIp(ip: string, reason: string): void {
    const pattern = this.requestPatterns.get(ip) || {
      requests: [],
      blocked: false,
    };

    pattern.blocked = true;
    pattern.blockedUntil = Date.now() + this.BLOCK_DURATION_MS;

    this.requestPatterns.set(ip, pattern);

    this.logger.warn(`Blocked IP ${ip}: ${reason}`);
  }

  private hasSuspiciousPattern(path: string): boolean {
    return this.SUSPICIOUS_PATTERNS.some((pattern) => pattern.test(path));
  }

  private trackRequest(ip: string, path: string, method: string): void {
    const now = Date.now();
    let pattern = this.requestPatterns.get(ip);

    if (!pattern) {
      pattern = { requests: [], blocked: false };
      this.requestPatterns.set(ip, pattern);
    }

    // Remove old requests outside the window
    pattern.requests = pattern.requests.filter(
      (r) => now - r.timestamp < this.PATTERN_WINDOW_MS,
    );

    // Add new request
    pattern.requests.push({ timestamp: now, path, method });
  }

  private getRequestCount(ip: string): number {
    return this.requestPatterns.get(ip)?.requests.length || 0;
  }

  private isRequestRateAnomalous(ip: string): boolean {
    return this.getRequestCount(ip) > this.MAX_REQUESTS_PER_MINUTE;
  }

  private getUniquePaths(ip: string): string[] {
    const pattern = this.requestPatterns.get(ip);
    if (!pattern) return [];

    return [...new Set(pattern.requests.map((r) => r.path))];
  }

  private isScanning(ip: string): boolean {
    const uniquePaths = this.getUniquePaths(ip);

    // Check for high number of unique 404-prone paths
    const scanningPatterns = [
      '/admin',
      '/wp-admin',
      '/phpmyadmin',
      '/.env',
      '/config',
      '/.git',
      '/backup',
      '/api/v1',
      '/api/v2',
    ];

    const matchCount = uniquePaths.filter((path) =>
      scanningPatterns.some((pattern) => path.toLowerCase().includes(pattern)),
    ).length;

    return matchCount >= 3;
  }

  private cleanup(): void {
    const now = Date.now();

    for (const [ip, pattern] of this.requestPatterns.entries()) {
      // Remove entries with no recent requests and not blocked
      if (
        pattern.requests.length === 0 &&
        (!pattern.blocked ||
          (pattern.blockedUntil && now > pattern.blockedUntil))
      ) {
        this.requestPatterns.delete(ip);
      }
    }
  }
}

/**
 * Lightweight version for high-traffic endpoints
 */
@Injectable()
export class LightweightSuspiciousActivityGuard implements CanActivate {
  private readonly blockedIps = new Set<string>();

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const forwarded = request.headers['x-forwarded-for'];
    const forwardedIp =
      typeof forwarded === 'string'
        ? forwarded.split(',')[0]?.trim()
        : undefined;
    const ip = forwardedIp || request.socket?.remoteAddress || 'unknown';

    if (this.blockedIps.has(ip)) {
      throw new ForbiddenException('Access blocked');
    }

    return true;
  }

  blockIp(ip: string): void {
    this.blockedIps.add(ip);
    // Auto-unblock after 15 minutes
    setTimeout(() => this.blockedIps.delete(ip), 15 * 60 * 1000);
  }
}
