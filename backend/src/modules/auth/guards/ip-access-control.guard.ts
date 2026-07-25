import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

/**
 * Restricts access to routes it guards to IP addresses configured via
 * ADMIN_IP_WHITELIST / ADMIN_IP_BLACKLIST (comma-separated IPv4 addresses or
 * CIDR ranges, e.g. "10.0.0.0/8,203.0.113.4"). Runs before auth guards so
 * requests from disallowed networks are rejected without ever reaching the
 * credential/JWT checks, cutting off remote brute-force and stolen-session
 * attempts against the admin panel at the network layer.
 *
 * Blacklist always wins. If no whitelist is configured, access is left to
 * the normal auth/role guards (so local dev and environments that haven't
 * opted in aren't locked out).
 */
@Injectable()
export class IpAccessControlGuard implements CanActivate {
  private readonly logger = new Logger(IpAccessControlGuard.name);

  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const clientIp = this.normalizeIp(this.getClientIp(request));

    const blacklist = this.parseList(
      this.configService.get<string>('ADMIN_IP_BLACKLIST'),
    );
    if (blacklist.some((entry) => this.matches(clientIp, entry))) {
      this.logger.warn(`Blocked admin access from blacklisted IP ${clientIp}`);
      throw new ForbiddenException('Access denied from this network');
    }

    const whitelist = this.parseList(
      this.configService.get<string>('ADMIN_IP_WHITELIST'),
    );
    if (whitelist.length === 0) {
      return true;
    }

    if (!whitelist.some((entry) => this.matches(clientIp, entry))) {
      this.logger.warn(
        `Blocked admin access from IP ${clientIp} (not in whitelist)`,
      );
      throw new ForbiddenException('Access denied from this network');
    }

    return true;
  }

  private getClientIp(request: Request): string {
    const forwarded = request.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.length > 0) {
      return forwarded.split(',')[0].trim();
    }
    return request.ip || request.socket?.remoteAddress || '';
  }

  /** Strips the ::ffff: prefix Node adds to IPv4-mapped IPv6 addresses. */
  private normalizeIp(ip: string): string {
    return ip.startsWith('::ffff:') ? ip.slice(7) : ip;
  }

  private parseList(raw: string | undefined): string[] {
    return (raw || '')
      .split(',')
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
  }

  private matches(ip: string, entry: string): boolean {
    if (!entry.includes('/')) {
      return ip === entry;
    }
    return this.isIpInCidr(ip, entry);
  }

  private isIpInCidr(ip: string, cidr: string): boolean {
    const [range, prefixStr] = cidr.split('/');
    const prefix = parseInt(prefixStr, 10);

    if (
      !this.isIPv4(ip) ||
      !this.isIPv4(range) ||
      Number.isNaN(prefix) ||
      prefix < 0 ||
      prefix > 32
    ) {
      return false;
    }

    const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
    return (this.ipv4ToInt(ip) & mask) === (this.ipv4ToInt(range) & mask);
  }

  private isIPv4(ip: string): boolean {
    return (
      /^(\d{1,3}\.){3}\d{1,3}$/.test(ip) &&
      ip.split('.').every((octet) => Number(octet) <= 255)
    );
  }

  private ipv4ToInt(ip: string): number {
    return (
      ip
        .split('.')
        .reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0
    );
  }
}
