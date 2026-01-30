import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import {
  SecurityEvent,
  SecurityEventType,
  SecurityEventSeverity,
} from './entities/security-event.entity';

export interface CreateSecurityEventDto {
  userId?: string;
  eventType: SecurityEventType;
  severity?: SecurityEventSeverity;
  ipAddress?: string;
  userAgent?: string;
  details?: Record<string, any>;
  success?: boolean;
  errorMessage?: string;
}

@Injectable()
export class SecurityEventsService {
  private readonly logger = new Logger(SecurityEventsService.name);

  constructor(
    @InjectRepository(SecurityEvent)
    private securityEventRepository: Repository<SecurityEvent>,
  ) {}

  /**
   * Create a security event
   */
  async createEvent(dto: CreateSecurityEventDto): Promise<SecurityEvent> {
    const event = this.securityEventRepository.create({
      userId: dto.userId,
      eventType: dto.eventType,
      severity: dto.severity || SecurityEventSeverity.MEDIUM,
      ipAddress: dto.ipAddress,
      userAgent: dto.userAgent,
      details: dto.details ? JSON.stringify(dto.details) : null,
      success: dto.success !== undefined ? dto.success : true,
      errorMessage: dto.errorMessage,
    });

    const savedEvent = await this.securityEventRepository.save(event);
    this.logger.log(
      `Security event created: ${dto.eventType} for user: ${dto.userId || 'unknown'}`,
    );

    return savedEvent;
  }

  /**
   * Get security events for a user
   */
  async getUserEvents(
    userId: string,
    limit: number = 100,
    offset: number = 0,
  ): Promise<SecurityEvent[]> {
    return this.securityEventRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });
  }

  /**
   * Get security events by type
   */
  async getEventsByType(
    eventType: SecurityEventType,
    limit: number = 100,
    offset: number = 0,
  ): Promise<SecurityEvent[]> {
    return this.securityEventRepository.find({
      where: { eventType },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });
  }

  /**
   * Get security events by severity
   */
  async getEventsBySeverity(
    severity: SecurityEventSeverity,
    limit: number = 100,
    offset: number = 0,
  ): Promise<SecurityEvent[]> {
    return this.securityEventRepository.find({
      where: { severity },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });
  }

  /**
   * Get recent security events
   */
  async getRecentEvents(
    hours: number = 24,
    limit: number = 100,
  ): Promise<SecurityEvent[]> {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    return this.securityEventRepository.find({
      where: {
        createdAt: Between(since, new Date()),
      },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * Get failed login attempts for an IP address
   */
  async getFailedLoginAttempts(
    ipAddress: string,
    hours: number = 1,
  ): Promise<number> {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    return this.securityEventRepository.count({
      where: {
        eventType: SecurityEventType.FAILED_LOGIN,
        ipAddress,
        createdAt: Between(since, new Date()),
      },
    });
  }

  /**
   * Check for suspicious activity patterns
   */
  async detectSuspiciousActivity(userId: string): Promise<boolean> {
    const recentEvents = await this.getUserEvents(userId, 50);

    // Check for multiple failed logins
    const failedLogins = recentEvents.filter(
      (e) => e.eventType === SecurityEventType.FAILED_LOGIN && !e.success,
    ).length;

    if (failedLogins >= 5) {
      await this.createEvent({
        userId,
        eventType: SecurityEventType.SUSPICIOUS_ACTIVITY,
        severity: SecurityEventSeverity.HIGH,
        details: { reason: 'multiple_failed_logins', count: failedLogins },
      });
      return true;
    }

    return false;
  }
}
