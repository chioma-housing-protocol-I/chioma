import { Injectable, Logger, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { AbuseDetectionResult } from '../types/rate-limit.types';
import { ABUSE_DETECTION_CONFIG } from '../config/rate-limit.config';

interface AbuseRecord {
  requestCount: number;
  failedAuthAttempts: number;
  violations: string[];
  firstSeen: number;
  lastSeen: number;
  ipAddresses: Set<string>;
}

@Injectable()
export class AbuseDetectionService {
  private readonly logger = new Logger(AbuseDetectionService.name);

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async detectAbuse(
    identifier: string,
    ipAddress: string,
    requestPath: string,
  ): Promise<AbuseDetectionResult> {
    const record = await this.getAbuseRecord(identifier);
    const abuseScore = this.calculateAbuseScore(record, ipAddress, requestPath);

    if (abuseScore >= ABUSE_DETECTION_CONFIG.abuseScoreLimit) {
      const blockUntil = new Date(
        Date.now() + ABUSE_DETECTION_CONFIG.blockDuration * 1000,
      );
      await this.blockIdentifier(
        identifier,
        ABUSE_DETECTION_CONFIG.blockDuration,
      );

      this.logger.warn(
        `Abuse detected for identifier: ${identifier}, score: ${abuseScore}`,
      );

      return {
        isAbuser: true,
        abuseScore,
        violations: record.violations,
        blockUntil,
      };
    }

    return {
      isAbuser: false,
      abuseScore,
      violations: record.violations,
    };
  }

  async recordRequest(identifier: string, ipAddress: string): Promise<void> {
    const record = await this.getAbuseRecord(identifier);
    record.requestCount++;
    record.lastSeen = Date.now();
    record.ipAddresses.add(ipAddress);

    if (!record.firstSeen) {
      record.firstSeen = Date.now();
    }

    await this.saveAbuseRecord(identifier, record);
  }

  async recordFailedAuth(identifier: string): Promise<void> {
    const record = await this.getAbuseRecord(identifier);
    record.failedAuthAttempts++;

    if (
      record.failedAuthAttempts >=
      ABUSE_DETECTION_CONFIG.suspiciousPatterns.repeatedFailedAuth
    ) {
      record.violations.push(
        `Excessive failed auth attempts: ${record.failedAuthAttempts}`,
      );
    }

    await this.saveAbuseRecord(identifier, record);
  }

  async recordViolation(identifier: string, violation: string): Promise<void> {
    const record = await this.getAbuseRecord(identifier);
    record.violations.push(`${new Date().toISOString()}: ${violation}`);
    await this.saveAbuseRecord(identifier, record);
  }

  async isBlocked(identifier: string): Promise<boolean> {
    const key = `abuse:block:${identifier}`;
    const blocked = await this.cacheManager.get<boolean>(key);
    return !!blocked;
  }

  async unblockIdentifier(identifier: string): Promise<void> {
    const key = `abuse:block:${identifier}`;
    await this.cacheManager.del(key);
    this.logger.log(`Unblocked identifier: ${identifier}`);
  }

  async getAbuseScore(identifier: string): Promise<number> {
    const record = await this.getAbuseRecord(identifier);
    return this.calculateAbuseScore(record, '', '');
  }

  private calculateAbuseScore(
    record: AbuseRecord,
    ipAddress: string,
    requestPath: string,
  ): number {
    let score = 0;

    const now = Date.now();
    const timeWindow = ABUSE_DETECTION_CONFIG.rapidFireWindow * 1000;

    if (record.lastSeen && now - record.lastSeen < timeWindow) {
      const requestRate =
        record.requestCount / ((now - record.firstSeen) / 1000);
      if (requestRate > ABUSE_DETECTION_CONFIG.rapidFireThreshold) {
        score += 30;
      }
    }

    score += Math.min(record.failedAuthAttempts * 7, 90);

    score += Math.min(record.violations.length * 10, 30);

    if (
      record.ipAddresses.size >
      ABUSE_DETECTION_CONFIG.suspiciousPatterns.rapidIpSwitching
    ) {
      score += 60;
    }

    const adminPaths = ['/admin', '/api/admin', '/users/admin'];
    if (adminPaths.some((path) => requestPath.includes(path))) {
      score += 15;
    }

    return Math.min(score, 100);
  }

  private async blockIdentifier(
    identifier: string,
    durationSeconds: number,
  ): Promise<void> {
    const key = `abuse:block:${identifier}`;
    await this.cacheManager.set(key, true, durationSeconds * 1000);

    await this.recordViolation(identifier, 'Blocked due to abuse detection');
  }

  private async getAbuseRecord(identifier: string): Promise<AbuseRecord> {
    const key = `abuse:record:${identifier}`;
    const cached = await this.cacheManager.get<any>(key);

    if (cached) {
      return {
        ...cached,
        ipAddresses: new Set(cached.ipAddresses || []),
      };
    }

    return {
      requestCount: 0,
      failedAuthAttempts: 0,
      violations: [],
      firstSeen: Date.now(),
      lastSeen: Date.now(),
      ipAddresses: new Set<string>(),
    };
  }

  private async saveAbuseRecord(
    identifier: string,
    record: AbuseRecord,
  ): Promise<void> {
    const key = `abuse:record:${identifier}`;
    const toSave = {
      ...record,
      ipAddresses: Array.from(record.ipAddresses),
    };
    await this.cacheManager.set(key, toSave, 24 * 3600 * 1000);
  }
}
