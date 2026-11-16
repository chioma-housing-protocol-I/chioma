import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, Between, LessThan } from 'typeorm';
import {
  LoginActivity,
  LoginStatus,
  LoginMethod,
} from '../entities/login-activity.entity';
import { User } from '../../users/entities/user.entity';
import * as UAParser from 'ua-parser-js';

export interface LoginContext {
  ipAddress?: string;
  userAgent?: string;
  country?: string;
  city?: string;
}

export interface LoginActivityLog {
  userId?: string;
  email?: string;
  loginMethod: LoginMethod;
  status: LoginStatus;
  context?: LoginContext;
  failureReason?: string;
  isSuspicious?: boolean;
  anomalyFlags?: string[];
  metadata?: Record<string, any>;
}

@Injectable()
export class LoginActivityService {
  private readonly logger = new Logger(LoginActivityService.name);

  constructor(
    @InjectRepository(LoginActivity)
    private loginActivityRepository: Repository<LoginActivity>,
  ) {}

  /**
   * Log a login attempt or activity
   */
  async logActivity(log: LoginActivityLog): Promise<LoginActivity> {
    try {
      const deviceInfo = this.parseUserAgent(log.context?.userAgent);

      const activity = this.loginActivityRepository.create({
        userId: log.userId ?? null,
        email: log.email ?? null,
        loginMethod: log.loginMethod,
        status: log.status,
        ipAddress: log.context?.ipAddress ?? null,
        userAgent: log.context?.userAgent ?? null,
        country: log.context?.country ?? null,
        city: log.context?.city ?? null,
        device: deviceInfo.device,
        browser: deviceInfo.browser,
        os: deviceInfo.os,
        failureReason: log.failureReason ?? null,
        isSuspicious: log.isSuspicious ?? false,
        anomalyFlags: log.anomalyFlags ?? null,
        metadata: log.metadata ?? null,
      });

      const savedActivity = await this.loginActivityRepository.save(activity);
      this.logger.log(
        `Login activity logged: ${savedActivity.id} - ${log.status} for user: ${log.userId ?? log.email}`,
      );

      return savedActivity;
    } catch (error) {
      this.logger.error(
        `Failed to log login activity for ${log.userId ?? log.email}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }

  /**
   * Get login history for a user
   */
  async getUserLoginHistory(
    userId: string,
    limit = 50,
    offset = 0,
  ): Promise<{ activities: LoginActivity[]; total: number }> {
    const [activities, total] = await this.loginActivityRepository.findAndCount(
      {
        where: { userId },
        order: { createdAt: 'DESC' },
        take: limit,
        skip: offset,
      },
    );

    return { activities, total };
  }

  /**
   * Get recent failed login attempts for a user
   */
  async getRecentFailedAttempts(
    userId: string,
    hoursAgo = 24,
  ): Promise<LoginActivity[]> {
    const since = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);

    return this.loginActivityRepository.find({
      where: {
        userId,
        status: LoginStatus.FAILED,
        createdAt: Between(since, new Date()),
      },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get suspicious login activities
   */
  async getSuspiciousActivities(
    limit = 100,
    offset = 0,
  ): Promise<{ activities: LoginActivity[]; total: number }> {
    const [activities, total] = await this.loginActivityRepository.findAndCount(
      {
        where: { isSuspicious: true },
        order: { createdAt: 'DESC' },
        take: limit,
        skip: offset,
      },
    );

    return { activities, total };
  }

  /**
   * Check if IP has multiple failed attempts
   */
  async getFailedAttemptsByIP(
    ipAddress: string,
    hoursAgo = 1,
  ): Promise<LoginActivity[]> {
    const since = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);

    return this.loginActivityRepository.find({
      where: {
        ipAddress,
        status: LoginStatus.FAILED,
        createdAt: Between(since, new Date()),
      },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get login statistics for a user
   */
  async getUserLoginStats(userId: string): Promise<{
    totalLogins: number;
    successfulLogins: number;
    failedAttempts: number;
    lastLoginAt: Date | null;
    uniqueIPs: number;
    suspiciousAttempts: number;
  }> {
    const activities = await this.loginActivityRepository.find({
      where: { userId },
      select: ['status', 'createdAt', 'ipAddress', 'isSuspicious'],
    });

    const successfulLogins = activities.filter(
      (a) => a.status === LoginStatus.SUCCESS,
    ).length;
    const failedAttempts = activities.filter(
      (a) => a.status === LoginStatus.FAILED,
    ).length;
    const suspiciousAttempts = activities.filter((a) => a.isSuspicious).length;

    const uniqueIPs = new Set(
      activities.map((a) => a.ipAddress).filter((ip) => ip !== null),
    ).size;

    const lastLogin = activities
      .filter((a) => a.status === LoginStatus.SUCCESS)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];

    return {
      totalLogins: activities.length,
      successfulLogins,
      failedAttempts,
      lastLoginAt: lastLogin?.createdAt ?? null,
      uniqueIPs,
      suspiciousAttempts,
    };
  }

  /**
   * Clean up old login activities (data retention)
   */
  async cleanupOldActivities(daysToKeep = 90): Promise<number> {
    const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);

    const result = await this.loginActivityRepository.delete({
      createdAt: LessThan(cutoffDate),
    });

    const deletedCount =
      typeof result.affected === 'number' ? result.affected : 0;
    this.logger.log(
      `Cleaned up ${deletedCount} login activities older than ${daysToKeep} days`,
    );

    return deletedCount;
  }

  /**
   * Parse user agent to extract device information
   */
  private parseUserAgent(userAgent?: string): {
    device: string | null;
    browser: string | null;
    os: string | null;
  } {
    if (!userAgent) {
      return { device: null, browser: null, os: null };
    }

    try {
      const parser = new UAParser(userAgent);
      const result = parser.getResult();

      const device = result.device.type
        ? `${result.device.vendor ?? ''} ${result.device.model ?? ''} (${result.device.type})`.trim()
        : 'Desktop';

      const browser = result.browser.name
        ? `${result.browser.name} ${result.browser.version ?? ''}`.trim()
        : null;

      const os = result.os.name
        ? `${result.os.name} ${result.os.version ?? ''}`.trim()
        : null;

      return {
        device: device || null,
        browser,
        os,
      };
    } catch (error) {
      this.logger.error(
        'Failed to parse user agent',
        error instanceof Error ? error.stack : String(error),
      );
      return { device: null, browser: null, os: null };
    }
  }

  /**
   * Check for concurrent logins from different locations
   */
  async detectConcurrentLogins(
    userId: string,
    currentIp: string,
    withinMinutes = 5,
  ): Promise<boolean> {
    const since = new Date(Date.now() - withinMinutes * 60 * 1000);

    const recentLogins = await this.loginActivityRepository.find({
      where: {
        userId,
        status: LoginStatus.SUCCESS,
        createdAt: Between(since, new Date()),
      },
    });

    // Check if there are logins from different IPs
    const uniqueIPs = new Set(recentLogins.map((l) => l.ipAddress));
    return uniqueIPs.size > 1 && !uniqueIPs.has(currentIp);
  }
}
